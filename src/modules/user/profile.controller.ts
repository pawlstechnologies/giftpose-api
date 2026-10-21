import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middleware/auth.middleware";
import ItemModel from "../items/item.model";
import LocationModel from "../location/location.model";
import { UserModel } from "../onboarding/auth.model";
import ReviewModel from "./review.model";
import NotificationModels from "../notification/notification.models";
import { DeviceAlertModel } from "../alerts/alerts.model";
import { sendPushNotification } from "../../utils/push";
import { sendNewReviewEmail } from "../../utils/email";

type ProfileItemStatus = "Active" | "Completed" | "Pending";

const ITEM_FIELDS =
    "name description imageUrls thumbnail city postCode country isTaken status type pickup categoryId subCategoryId contentId interestedDevices createdAt updatedAt expiration";

/**
 * Formats a Date into a relative uppercase timestamp (e.g. "2 DAYS AGO", "3 HOURS AGO").
 */
const formatRelativeTime = (date?: Date): string => {
    if (!date) return "RECENTLY";
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${Math.max(1, diffMins)} MINS AGO`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "HOUR" : "HOURS"} AGO`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "DAY" : "DAYS"} AGO`;
};

/**
 * Normalises an item document into the lightweight shape used by the
 * profile screens (My Gifts / My Requests lists).
 */
const toProfileItem = (item: any, status: ProfileItemStatus, editable: boolean) => ({
    _id: item._id,
    name: item.name,
    description: item.description ?? "",
    thumbnail: item.thumbnail || (item.imageUrls?.[0] ?? ""),
    imageUrls: item.imageUrls ?? [],
    city: item.city ?? "",
    postCode: item.postCode ?? "",
    country: item.country || "United Kingdom",
    type: item.type,
    pickup: item.pickup ?? "Pickup",
    categoryId: item.categoryId,
    subCategoryId: item.subCategoryId,
    contentId: item.contentId,
    interestedCount: Array.isArray(item.interestedDevices) ? item.interestedDevices.length : 0,
    status,
    profileStatus: status,
    editable,
    createdAt: item.createdAt,
});

/**
 * Builds the aggregated reviews payload for a target user.
 */
const buildReviewsSummary = async (userObjectId: mongoose.Types.ObjectId) => {
    const dbReviews = await ReviewModel.find({ targetUserId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    if (dbReviews.length > 0) {
        const total = dbReviews.length;
        const breakdown: Record<string, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
        let sum = 0;
        for (const r of dbReviews) {
            const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
            breakdown[String(star)] = (breakdown[String(star)] || 0) + 1;
            sum += star;
        }
        const average = Number((sum / total).toFixed(1));
        return {
            average,
            total,
            breakdown,
            items: dbReviews.map((r: any) => ({
                _id: r._id,
                name: r.reviewerName || "Community Member",
                avatar:
                    r.reviewerAvatar ||
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                rating: r.rating,
                time: formatRelativeTime(r.createdAt),
                comment: r.comment,
                createdAt: r.createdAt,
            })),
        };
    }

    return {
        average: 0,
        total: 0,
        breakdown: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
        items: [],
    };
};

/**
 * GET /api/user/profile
 *
 * Returns the authenticated user's full profile: identity, location,
 * headline stats ("Gifts Given" & "Donations"), My Gifts list, My Requests list,
 * and Reviews summary + review cards.
 */
export const getProfile = async (
    req: AuthRequest<{}, {}, { limit?: string }>,
    res: Response
) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        const userObjectId = new mongoose.Types.ObjectId(String(user._id));
        const deviceId: string | undefined = user.deviceId;
        const limit = Math.min(
            Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1),
            100
        );

        // Items the user posted as a giver ("offer" or unspecified type).
        const ownedOfferFilter: any = {
            type: { $ne: "request" },
            $or: [{ userId: userObjectId }, ...(deviceId ? [{ deviceId }] : [])],
        };

        // Requests: items the user posted as a request + items they expressed interest in.
        const requestFilter: any = {
            $or: [
                { type: "request", userId: userObjectId },
                ...(deviceId ? [{ type: "request", deviceId }] : []),
                { "interestedByDevices.userId": userObjectId },
                ...(deviceId ? [{ interestedDevices: deviceId }] : []),
            ],
        };

        const [giftsGiven, donations, gifts, requests, requestCount, location, reviews] =
            await Promise.all([
                ItemModel.countDocuments({
                    ...ownedOfferFilter,
                    $and: [{ $or: [{ isTaken: true }, { status: "completed" }] }],
                }),
                ItemModel.countDocuments(ownedOfferFilter),
                ItemModel.find(ownedOfferFilter)
                    .populate("categoryId", "name")
                    .select(ITEM_FIELDS)
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean(),
                ItemModel.find(requestFilter)
                    .populate("categoryId", "name")
                    .select(ITEM_FIELDS + " userId")
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean(),
                ItemModel.countDocuments(requestFilter),
                deviceId ? LocationModel.findOne({ deviceId }).lean() : null,
                buildReviewsSummary(userObjectId),
            ]);

        const myGifts = gifts.map((item: any) => {
            const isCompleted = item.isTaken || item.status === "completed";
            return toProfileItem(item, isCompleted ? "Completed" : "Active", !isCompleted);
        });

        const myRequests = requests.map((item: any) => {
            const isCompleted = item.isTaken || item.status === "completed";
            const ownsRequest =
                item.type === "request" && String(item.userId) === String(userObjectId);
            return toProfileItem(
                item,
                isCompleted ? "Completed" : "Pending",
                ownsRequest && !isCompleted
            );
        });

        return res.status(200).json({
            status: true,
            message: "Profile fetched",
            data: {
                user: {
                    _id: user._id,
                    fullname: user.fullname,
                    username: user.username,
                    email: user.email,
                    isVerified: !!user.isVerified,
                    createdAt: user.createdAt,
                },
                location: {
                    city: (location as any)?.city ?? "",
                    postCode: (location as any)?.postCode ?? "",
                    country: "United Kingdom",
                },
                stats: {
                    giftsGiven,
                    donations,
                    requests: requestCount,
                },
                myGifts,
                myRequests,
                reviews,
            },
        });
    } catch (err: any) {
        console.error("getProfile error:", err);
        return res.status(500).json({
            status: false,
            message: err?.message ?? "Failed to load profile",
        });
    }
};

/**
 * PATCH /api/user/profile
 *
 * Updates the authenticated user's profile fields (fullname, username, city, postCode).
 */
export const updateProfile = async (
    req: AuthRequest<{}, { fullname?: string; username?: string; city?: string; postCode?: string }>,
    res: Response
) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        const { fullname, username, city, postCode } = req.body || {};
        const updateFields: Record<string, any> = {};
        if (typeof fullname === "string" && fullname.trim().length > 0) {
            updateFields.fullname = fullname.trim();
        }
        if (typeof username === "string" && username.trim().length > 0) {
            updateFields.username = username.trim();
        }

        const updatedUser =
            Object.keys(updateFields).length > 0
                ? await UserModel.findByIdAndUpdate(user._id, updateFields, {
                      new: true,
                  }).select("-password")
                : user;

        if (user.deviceId && (city || postCode)) {
            await LocationModel.findOneAndUpdate(
                { deviceId: user.deviceId },
                {
                    ...(city ? { city: city.trim() } : {}),
                    ...(postCode ? { postCode: postCode.trim() } : {}),
                },
                { upsert: false }
            );
        }

        return res.status(200).json({
            status: true,
            message: "Profile updated successfully",
            data: { user: updatedUser },
        });
    } catch (err: any) {
        console.error("updateProfile error:", err);
        return res.status(500).json({
            status: false,
            message: err?.message ?? "Failed to update profile",
        });
    }
};

/**
 * GET /api/user/my-gifts
 *
 * Returns filtered & paginated gifts posted by the authenticated user.
 * Query params:
 *   - status: "All" | "Pending" | "Active" | "Completed"
 *   - page: page number (default 1)
 *   - limit: items per page (default 20)
 */
export const getMyGifts = async (
    req: AuthRequest<{}, {}, { status?: string; page?: string; limit?: string }>,
    res: Response
) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        const userObjectId = new mongoose.Types.ObjectId(String(user._id));
        const deviceId: string | undefined = user.deviceId;
        const statusFilter = String(req.query.status ?? "All").toLowerCase();
        const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
        const limit = Math.min(
            Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1),
            100
        );

        const filter: any = {
            type: { $ne: "request" },
            $or: [{ userId: userObjectId }, ...(deviceId ? [{ deviceId }] : [])],
        };

        if (statusFilter === "completed" || statusFilter === "accepted") {
            filter.$and = [{ $or: [{ isTaken: true }, { status: "completed" }] }];
        } else if (
            statusFilter === "active" ||
            statusFilter === "pending" ||
            statusFilter === "live"
        ) {
            filter.isTaken = { $ne: true };
            filter.status = { $ne: "completed" };
        }

        const [items, total] = await Promise.all([
            ItemModel.find(filter)
                .populate("categoryId", "name")
                .select(ITEM_FIELDS)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ItemModel.countDocuments(filter),
        ]);

        const data = items.map((item: any) => {
            const isCompleted = item.isTaken || item.status === "completed";
            return toProfileItem(item, isCompleted ? "Completed" : "Active", !isCompleted);
        });

        return res.status(200).json({
            status: true,
            message: "My gifts fetched",
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (err: any) {
        console.error("getMyGifts error:", err);
        return res.status(500).json({
            status: false,
            message: err?.message ?? "Failed to fetch gifts",
        });
    }
};

/**
 * GET /api/user/my-requests
 *
 * Returns filtered & paginated requests made by the authenticated user.
 * Query params:
 *   - status: "All" | "Active" | "Pending" | "Completed"
 *   - page: page number (default 1)
 *   - limit: items per page (default 20)
 */
export const getMyRequests = async (
    req: AuthRequest<{}, {}, { status?: string; page?: string; limit?: string }>,
    res: Response
) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        const userObjectId = new mongoose.Types.ObjectId(String(user._id));
        const deviceId: string | undefined = user.deviceId;
        const statusFilter = String(req.query.status ?? "All").toLowerCase();
        const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
        const limit = Math.min(
            Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1),
            100
        );

        const filter: any = {
            $or: [
                { type: "request", userId: userObjectId },
                ...(deviceId ? [{ type: "request", deviceId }] : []),
                { "interestedByDevices.userId": userObjectId },
                ...(deviceId ? [{ interestedDevices: deviceId }] : []),
            ],
        };

        if (statusFilter === "completed") {
            filter.$and = [{ $or: [{ isTaken: true }, { status: "completed" }] }];
        } else if (statusFilter === "active" || statusFilter === "pending") {
            filter.isTaken = { $ne: true };
            filter.status = { $ne: "completed" };
        }

        const [items, total] = await Promise.all([
            ItemModel.find(filter)
                .populate("categoryId", "name")
                .select(ITEM_FIELDS + " userId")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ItemModel.countDocuments(filter),
        ]);

        const data = items.map((item: any) => {
            const isCompleted = item.isTaken || item.status === "completed";
            const ownsRequest =
                item.type === "request" && String(item.userId) === String(userObjectId);
            return toProfileItem(
                item,
                isCompleted ? "Completed" : "Pending",
                ownsRequest && !isCompleted
            );
        });

        return res.status(200).json({
            status: true,
            message: "My requests fetched",
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (err: any) {
        console.error("getMyRequests error:", err);
        return res.status(500).json({
            status: false,
            message: err?.message ?? "Failed to fetch requests",
        });
    }
};

/**
 * GET /api/user/reviews
 *
 * Returns the authenticated user's rating breakdown and review cards.
 */
export const getUserReviews = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        const userObjectId = new mongoose.Types.ObjectId(String(user._id));
        const reviews = await buildReviewsSummary(userObjectId);

        return res.status(200).json({
            status: true,
            message: "Reviews fetched",
            data: reviews,
        });
    } catch (err: any) {
        console.error("getUserReviews error:", err);
        return res.status(500).json({
            status: false,
            message: err?.message ?? "Failed to fetch reviews",
        });
    }
};

/**
 * POST /api/user/reviews/:targetUserId
 *
 * Submits a new rating and review for a user.
 */
export const createUserReview = async (
    req: AuthRequest<
        { targetUserId: string },
        { rating: number; comment: string; itemId?: string }
    >,
    res: Response
) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        const { targetUserId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ status: false, message: "Invalid targetUserId" });
        }

        const rating = Math.min(5, Math.max(1, Number(req.body?.rating) || 5));
        const comment = String(req.body?.comment ?? "").trim();
        if (!comment) {
            return res.status(400).json({ status: false, message: "Review comment is required" });
        }

        const reviewerName = user.fullname || user.username || "GiftPose User";

        const review = await ReviewModel.create({
            targetUserId: new mongoose.Types.ObjectId(targetUserId),
            reviewerUserId: new mongoose.Types.ObjectId(String(user._id)),
            reviewerName,
            rating,
            comment,
            ...(req.body?.itemId && mongoose.Types.ObjectId.isValid(req.body.itemId)
                ? { itemId: new mongoose.Types.ObjectId(req.body.itemId) }
                : {}),
        });

        // Notify the reviewed user via In-App, Push, and Email
        try {
            const targetUser = await UserModel.findById(targetUserId).lean();
            const targetLocation = await LocationModel.findOne({
                $or: [
                    { user: new mongoose.Types.ObjectId(targetUserId) },
                    ...(targetUser?.deviceId ? [{ deviceId: targetUser.deviceId }] : []),
                ],
            }).lean();
            const targetDeviceId =
                targetUser?.deviceId ||
                (targetLocation as any)?.deviceId ||
                String(targetUserId);

            // 1. In-App Notification
            await NotificationModels.create({
                deviceId: targetDeviceId,
                userId: new mongoose.Types.ObjectId(targetUserId),
                title: "New Review Received ⭐",
                message: `${reviewerName} left you a ${rating}-star review: "${comment}"`,
                type: "New_Review",
                img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                data: {
                    reviewId: String(review._id),
                    itemId: req.body?.itemId ? String(req.body.itemId) : "",
                },
            });

            // 2. Push Notification
            const targetAlert = await DeviceAlertModel.findOne({ deviceId: targetDeviceId }).lean();
            const fcmToken =
                (targetLocation as any)?.firebaseToken || (targetAlert as any)?.firebaseToken;
            if (fcmToken) {
                await sendPushNotification(
                    fcmToken,
                    "New Review Received ⭐",
                    `${reviewerName} left you a ${rating}-star review`,
                    {
                        type: "New_Review",
                        reviewId: String(review._id),
                        itemId: req.body?.itemId ? String(req.body.itemId) : "",
                    }
                );
            }

            // 3. Email Notification
            if (targetUser?.email) {
                await sendNewReviewEmail(targetUser.email, reviewerName, rating, comment);
            }
        } catch (notifyErr: any) {
            console.error("⚠️ Review notification side-effect error:", notifyErr?.message || notifyErr);
        }

        return res.status(201).json({
            status: true,
            message: "Review submitted successfully",
            data: review,
        });
    } catch (err: any) {
        console.error("createUserReview error:", err);
        return res.status(500).json({
            status: false,
            message: err?.message ?? "Failed to submit review",
        });
    }
};

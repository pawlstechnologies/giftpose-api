import mongoose from "mongoose";
import axios from 'axios';
import ItemModel from './item.model';
import { ItemInterface } from './item.types';
import ApiError from '../../utils/ApiError';
import { PipelineStage } from 'mongoose';

import LocationModel from '../location/location.model';
import TrashNotingApi from '../../utils/trashnothing.api';
import { getDistancebetweenCoordinates, calculateTravelTimes } from '../../utils/distance';
import OpenAIClient from "../../utils/openai.client";
import { CategoryModel } from "../category/category.model";
import { SubCategoryModel } from "../category/category.model";
import { ContentModel } from "../category/category.model";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import {
    sendPostCreatedEmail,
    sendPostRequestEmail,
    sendNewItemAlertEmail
} from "../../utils/email";
import NotificationModels from "../notification/notification.models";
import { LocationService } from "../location/location.service";
import { sendBulkPushNotification, sendPushNotification } from "../../utils/push";
import OpenAI from "openai";
import { DeviceAlertModel } from "../alerts/alerts.model";
import { UserModel } from "../onboarding/auth.model";



export default class ItemService {

    async createItem(data: ItemInterface) {
        if (!data.lng || !data.lat) {
            throw new ApiError(413, 'Latitude and longitude are required');
        }

        const item = await ItemModel.create({
            ...data,
            location: {
                type: 'Point',
                coordinates: [data.lng, data.lat]
            }
        });

        return item;

    }

    async analyseImage(files: Express.Multer.File[]) {

        if (!files || files.length === 0) {
            throw new ApiError(413, 'Images are required, upload atleast one image');
        }

        // 🔥 1. Upload all images to Cloudinary
        const imageUrls: string[] = [];
        for (const file of files) {
            const url = await uploadToCloudinary(file.path);
            imageUrls.push(url);
        }

        const taxonomy = await this.getTaxonomy();

        // 🔥 Combine images into one AI request
        const ai = await OpenAIClient.imageCategorisatiion(
            {
                title: "",
                description: "",
                images: imageUrls
            },
            taxonomy //await this.getTaxonomy()
        );
        // 🔹 Map AI outputs to DB IDs (if they exist)
        let category = await CategoryModel.findOne({ name: ai.category });
        let subcategory = await SubCategoryModel.findOne({ name: ai.subcategory });
        let content = await ContentModel.findOne({ name: ai.content });


        // 🔥 HANDLE SUGGESTED CATEGORY
        let suggestedCategoryDoc = null;
        if (!category && ai.suggestedCategory) {
            suggestedCategoryDoc = await CategoryModel.findOne({ name: ai.suggestedCategory.trim() });
            if (!suggestedCategoryDoc) {
                suggestedCategoryDoc = new CategoryModel({ name: ai.suggestedCategory.trim() });
                await suggestedCategoryDoc.save(); // ✅ triggers pre-save slug
            }
        }


        // 🔹 Suggested SubCategory
        let suggestedSubcategoryDoc = null;
        if (!subcategory && ai.suggestedSubcategory && suggestedCategoryDoc) {
            suggestedSubcategoryDoc = await SubCategoryModel.findOne({
                name: ai.suggestedSubcategory.trim(),
                categoryId: suggestedCategoryDoc._id
            });

            if (!suggestedSubcategoryDoc) {
                suggestedSubcategoryDoc = new SubCategoryModel({
                    name: ai.suggestedSubcategory.trim(),
                    categoryId: suggestedCategoryDoc._id
                });
                await suggestedSubcategoryDoc.save(); // ✅ triggers slug
            }
        }

        // 🔹 Suggested Content
        let suggestedContentDoc = null;
        if (!content && ai.suggestedContent && suggestedSubcategoryDoc) {
            suggestedContentDoc = await ContentModel.findOne({
                name: ai.suggestedContent.trim(),
                subcategoryId: suggestedSubcategoryDoc._id
            });

            if (!suggestedContentDoc) {
                suggestedContentDoc = new ContentModel({
                    name: ai.suggestedContent.trim(),
                    subcategoryId: suggestedSubcategoryDoc._id
                });
                await suggestedContentDoc.save(); // ✅ triggers slug
            }
        }

        return {
            name: ai.title || ai.content || "Generated Item",
            description: ai.description || ai.content,

            category: category
                ? {
                    _id: category._id,
                    name: category.name,
                    slug: category.slug,
                    status: category.status,

                    subcategories: subcategory
                        ? [
                            {
                                _id: subcategory._id,
                                name: subcategory.name,
                                categoryId: subcategory.categoryId,
                                status: subcategory.status,
                                slug: subcategory.slug,

                                contents: content
                                    ? [
                                        {
                                            _id: content._id,
                                            name: content.name,
                                            status: content.status,
                                            subcategoryId: content.subcategoryId,
                                            slug: content.slug
                                        }
                                    ]
                                    : []
                            }
                        ]
                        : []
                }
                : null,

            // 🔥 Suggested (same structure)
            suggestedCategory: suggestedCategoryDoc
                ? {
                    _id: suggestedCategoryDoc._id,
                    name: suggestedCategoryDoc.name,
                    slug: suggestedCategoryDoc.slug,
                    status: suggestedCategoryDoc.status,

                    subcategories: suggestedSubcategoryDoc
                        ? [
                            {
                                _id: suggestedSubcategoryDoc._id,
                                name: suggestedSubcategoryDoc.name,
                                categoryId: suggestedSubcategoryDoc.categoryId,
                                status: suggestedSubcategoryDoc.status,
                                slug: suggestedSubcategoryDoc.slug,

                                contents: suggestedContentDoc
                                    ? [
                                        {
                                            _id: suggestedContentDoc._id,
                                            name: suggestedContentDoc.name,
                                            status: suggestedContentDoc.status,
                                            subcategoryId: suggestedContentDoc.subcategoryId,
                                            slug: suggestedContentDoc.slug
                                        }
                                    ]
                                    : []
                            }
                        ]
                        : []
                }
                : null,

            images: imageUrls
        };



        // return {
        //     name: ai.title || ai.content || "Generated Item",
        //     description: ai.description || ai.content,

        //     category: ai.category || "",
        //     categoryId: category?._id || null,

        //     subcategory: ai.subcategory || "",
        //     subcategoryId: subcategory?._id || null,

        //     content: ai.content || "",
        //     contentId: content?._id || null,


        //     // suggestedCategory: ai.suggestedCategory || "",
        //     // suggestedSubcategory: ai.suggestedSubcategory || "",
        //     // suggestedContent: ai.suggestedContent || "",


        //     suggestedCategory: ai.suggestedCategory || "",
        //     suggestedCategoryId: suggestedCategoryDoc?._id || null,

        //     suggestedSubcategory: ai.suggestedSubcategory || "",
        //     suggestedSubcategoryId: suggestedSubcategoryDoc?._id || null,

        //     suggestedContent: ai.suggestedContent || "",
        //     suggestedContentId: suggestedContentDoc?._id || null,

        //     images: imageUrls
        // };

    }


    async postItem(data: any, file: any, user: any) {

        let {
            name,
            description,
            categoryId,
            subcategoryId,
            contentId,
            suggestedCategoryId,
            suggestedSubcategoryId,
            suggestedContentId,
            imageUrls = [],
            postCode,
            country = 'United Kingdom',
            pickup = 'Pickup'
        } = data;

        if (file && file.path) {
            imageUrls.push(file.path);
        }

        let finalCategoryId = categoryId || suggestedCategoryId;
        let finalSubcategoryId = subcategoryId || suggestedSubcategoryId;
        let finalContentId = contentId || suggestedContentId;

        // Auto-resolve category if missing or invalid
        if (!finalCategoryId || !mongoose.Types.ObjectId.isValid(finalCategoryId)) {
            const cat = await CategoryModel.findOne();
            if (cat) finalCategoryId = cat._id;
        }

        if (!finalSubcategoryId || !mongoose.Types.ObjectId.isValid(finalSubcategoryId)) {
            const sub = await SubCategoryModel.findOne(finalCategoryId ? { categoryId: finalCategoryId } : {});
            if (sub) {
                finalSubcategoryId = sub._id;
            } else {
                const anySub = await SubCategoryModel.findOne();
                if (anySub) finalSubcategoryId = anySub._id;
            }
        }

        if (!finalContentId || !mongoose.Types.ObjectId.isValid(finalContentId)) {
            const content = await ContentModel.findOne(finalSubcategoryId ? { subcategoryId: finalSubcategoryId } : {});
            if (content) {
                finalContentId = content._id;
            } else {
                const anyContent = await ContentModel.findOne();
                if (anyContent) finalContentId = anyContent._id;
            }
        }

        let city = '';
        let coordinates = [0, 0];

        // Resolve location
        let userLocation: any = null;
        if (user?._id) {
            userLocation = await LocationModel.findOne({ user: user._id });
        }
        if (!userLocation && user?.deviceId) {
            userLocation = await LocationModel.findOne({ deviceId: user.deviceId });
        }

        if (!postCode && userLocation?.postcode) {
            postCode = userLocation.postcode;
        }
        if (!postCode) {
            postCode = 'SW1A 1AA';
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (apiKey && postCode) {
            try {
                const response = await axios.get(
                    'https://maps.googleapis.com/maps/api/geocode/json',
                    {
                        params: { address: postCode, key: apiKey }
                    }
                );
                const geoData = response.data;
                if (geoData.status === 'OK' && geoData.results?.length) {
                    const result = geoData.results[0];
                    coordinates = [result.geometry.location.lng, result.geometry.location.lat];
                    const cityComponent = result.address_components.find((comp: any) =>
                        comp.types.includes('locality') || comp.types.includes('postal_town')
                    );
                    city = cityComponent?.long_name || '';
                }
            } catch (err) {
                console.warn('Geocoding in postItem failed:', err);
            }
        }

        if (coordinates[0] === 0 && coordinates[1] === 0 && userLocation) {
            coordinates = [userLocation.longitude || 0, userLocation.latitude || 0];
            city = userLocation.city || city || 'London';
        }
        if (!city && userLocation?.city) {
            city = userLocation.city;
        }
        if (!city) {
            city = country || 'United Kingdom';
        }

        // 🔥 3. Create item
        const item = await ItemModel.create({
            userId: user._id,
            deviceId: user.deviceId,

            name: name || 'Gift Item',
            description: description || '',
            imageUrls,

            categoryId: finalCategoryId,
            subCategoryId: finalSubcategoryId,
            contentId: finalContentId,

            isCategorised: true,

            city,
            postCode,
            country,

            location: {
                type: 'Point',
                coordinates
            },

            partner: 'Gifpose', ///user.email,

            expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

            postId: Date.now() + Math.floor(Math.random() * 1000),

            status: 'Live',
            type: "offer",
            pickup: pickup || 'Pickup',

            thumbnail: imageUrls?.[0] || ''
        });

        try {
            await this.handlePostSideEffects(user, item);
        } catch (e) {
            console.error('Post side effect error:', e);
        }

        return item;
    }

    async getTaxonomy() {

        // const categories = await CategoryModel.find().lean();
        // const subcategories = await SubCategoryModel.find().lean();
        // const contents = await ContentModel.find().lean();

        const categories = await CategoryModel.find({}, { name: 1 }).lean();
        const subcategories = await SubCategoryModel.find({}, { name: 1, categoryId: 1 }).lean();
        const contents = await ContentModel.find({}, { name: 1, subcategoryId: 1 }).lean();

        return {
            categories,
            subcategories,
            contents
        };
    }



    async postItemRequest(data: any, file: any, user: any) {

        const {
            name,
            description,
            categoryId,
            subcategoryId,
            contentId,
            suggestedCategoryId,
            suggestedSubcategoryId,
            suggestedContentId,
            imageUrls,
            postCode,
            type,
            pickup,
            country } = data;

        const finalCategoryId = categoryId || suggestedCategoryId;
        const finalSubcategoryId = subcategoryId || suggestedSubcategoryId;
        const finalContentId = contentId || suggestedContentId;

        if (!finalCategoryId || !finalSubcategoryId || !finalContentId) {
            throw new Error('Invalid category structure');
        }

        if (!mongoose.Types.ObjectId.isValid(finalCategoryId)) {
            throw new Error('Invalid category ID');
        }

        if (!mongoose.Types.ObjectId.isValid(finalSubcategoryId)) {
            throw new Error('Invalid subcategory ID');
        }

        if (!mongoose.Types.ObjectId.isValid(finalContentId)) {
            throw new Error('Invalid content ID');
        }


        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            throw new Error('Google Maps API key is not configured');
        }

        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            {
                params: { address: postCode, key: apiKey }
            }
        );

        const geoData = response.data;

        if (geoData.status !== 'OK' || !geoData.results.length) {
            throw new Error('Location not found for the provided postcode');
        }

        const result = geoData.results[0];
        const location = result.geometry.location;

        const cityComponent = result.address_components.find((comp: any) =>
            comp.types.includes('locality') ||
            comp.types.includes('postal_town')
        );

        const city = cityComponent?.long_name || '';


        // const userId = user._id;
        // const deviceId = user.deviceId;


        // 🔥 3. Create item
        const item = await ItemModel.create({
            userId: user._id,
            deviceId: user.deviceId,

            name,
            description,
            imageUrls,

            categoryId: finalCategoryId,
            subCategoryId: finalSubcategoryId,
            contentId: finalContentId,

            isCategorised: true,

            city,
            postCode,
            country,

            location: {
                type: 'Point',
                coordinates: [location.lng, location.lat]
            },

            partner: 'Gifpose',

            expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

            postId: Date.now() + Math.floor(Math.random() * 1000),

            status: 'Live',
            type: type || "request",
            pickup: pickup,

            thumbnail: imageUrls?.[0] || ''
        });

        await this.handlePostSideEffects(user, item);

        return item;

    }


    async updateItem(
        itemId: string,
        data: any,
        user: any
    ) {

        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw new Error("Invalid item ID");
        }

        const item = await ItemModel.findById(itemId);

        if (!item) {
            throw new Error("Item not found");
        }

        // Optional ownership check
        if (item.userId.toString() !== user._id.toString()) {
            throw new Error("Unauthorized");
        }

        const {
            name,
            description,

            categoryId,
            subcategoryId,
            contentId,

            suggestedCategoryId,
            suggestedSubcategoryId,
            suggestedContentId,

            postCode,
            country,
            pickup,
            type,

            addImages = [],
            removeImages = [],
        } = data;

        // =====================================================
        // CATEGORY HANDLING
        // =====================================================

        const finalCategoryId =
            categoryId || suggestedCategoryId || item.categoryId;

        const finalSubcategoryId =
            subcategoryId ||
            suggestedSubcategoryId ||
            item.subCategoryId;

        const finalContentId =
            contentId ||
            suggestedContentId ||
            item.contentId;

        if (
            !mongoose.Types.ObjectId.isValid(finalCategoryId)
        ) {
            throw new Error("Invalid category ID");
        }

        if (
            !mongoose.Types.ObjectId.isValid(finalSubcategoryId)
        ) {
            throw new Error("Invalid subcategory ID");
        }

        if (
            !mongoose.Types.ObjectId.isValid(finalContentId)
        ) {
            throw new Error("Invalid content ID");
        }
        const subcategory =
            await SubCategoryModel.findOne({
                _id: finalSubcategoryId,
                categoryId: finalCategoryId,
            });

        if (!subcategory) {
            throw new Error(
                "Subcategory does not belong to category"
            );
        }

        // =====================================================
        // LOCATION UPDATE
        // =====================================================

        let updatedLocation = item.location;
        let updatedCity = item.city;
        let updatedPostCode = item.postCode;

        if (postCode && postCode !== item.postCode) {

            const apiKey = process.env.GOOGLE_MAPS_API_KEY;

            if (!apiKey) {
                throw new Error(
                    "Google Maps API key is not configured"
                );
            }

            const response = await axios.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                {
                    params: {
                        address: postCode,
                        key: apiKey,
                    },
                }
            );

            const geoData = response.data;

            if (
                geoData.status !== "OK" ||
                !geoData.results.length
            ) {
                throw new Error(
                    "Location not found for the provided postcode"
                );
            }

            const result = geoData.results[0];

            const location = result.geometry.location;

            const cityComponent =
                result.address_components.find(
                    (comp: any) =>
                        comp.types.includes("locality") ||
                        comp.types.includes("postal_town")
                );

            updatedCity =
                cityComponent?.long_name || "";

            updatedPostCode = postCode;

            updatedLocation = {
                type: "Point",
                coordinates: [
                    location.lng,
                    location.lat,
                ],
            };
        }

        // =====================================================
        // IMAGE HANDLING
        // =====================================================

        let updatedImages = [...(item.imageUrls || [])];

        // Remove images
        if (
            Array.isArray(removeImages) &&
            removeImages.length
        ) {
            updatedImages = updatedImages.filter(
                (img) => !removeImages.includes(img)
            );
        }

        // Add new images
        if (
            Array.isArray(addImages) &&
            addImages.length
        ) {
            updatedImages.push(...addImages);
        }

        // Remove duplicates
        updatedImages = [...new Set(updatedImages)];

        // =====================================================
        // UPDATE ITEM
        // =====================================================

        item.name = name || item.name;

        item.description =
            description || item.description;

        item.categoryId = finalCategoryId;

        item.subCategoryId =
            finalSubcategoryId;

        item.contentId = finalContentId;

        item.postCode = updatedPostCode;

        item.country = country || item.country;

        item.city = updatedCity;

        item.location = updatedLocation;

        item.pickup =
            pickup !== undefined
                ? pickup
                : item.pickup;

        item.type = type || item.type;

        item.imageUrls = updatedImages;

        // Auto update thumbnail
        item.thumbnail =
            updatedImages?.[0] || "";

        await item.save();

        return item;
    }



    async handlePostSideEffects(user: any, item: any) {
        try {
            console.log('🚀 Running post side effects...');

            const defaultImg =
                item.thumbnail ||
                item.imageUrls?.[0] ||
                'https://res.cloudinary.com/dxfq3iotg/image/upload/v1692099205/giftpose/default-item.png';

            let posterLocation: any = null;
            if (user?._id) {
                posterLocation = await LocationModel.findOne({ user: user._id }).lean();
            }
            if (!posterLocation && user?.deviceId) {
                posterLocation = await LocationModel.findOne({ deviceId: user.deviceId }).lean();
            }

            const posterDeviceId =
                user?.deviceId ||
                posterLocation?.deviceId ||
                item.deviceId ||
                String(user?._id || '');

            // 1. Notify poster In-App
            try {
                if (posterDeviceId) {
                    await NotificationModels.create({
                        deviceId: posterDeviceId,
                        userId: user?._id,
                        title: 'Item Posted',
                        message: `${item.name} is now live`,
                        type: 'Item_Posted',
                        img: defaultImg,
                        data: { itemId: String(item._id) }
                    });
                    console.log('🔔 In-app notification created for poster');
                }
            } catch (inAppErr: any) {
                console.error('⚠️ Poster in-app notification error:', inAppErr?.message || inAppErr);
            }

            // 2. Notify poster via Push Notification
            try {
                const posterAlert = posterDeviceId
                    ? await DeviceAlertModel.findOne({ deviceId: posterDeviceId }).lean()
                    : null;
                const posterFcmToken =
                    posterLocation?.firebaseToken || (posterAlert as any)?.firebaseToken;
                if (posterFcmToken) {
                    await sendPushNotification(
                        posterFcmToken,
                        'Item Posted 🎉',
                        `${item.name} is now live on GiftPose!`,
                        {
                            id: String(item._id),
                            itemId: String(item._id),
                            type: 'Item_Posted'
                        }
                    );
                }
            } catch (pushErr: any) {
                console.error('⚠️ Poster push notification error:', pushErr?.message || pushErr);
            }

            // 3. Notify poster by Email
            if (user?.email) {
                await sendPostCreatedEmail(user.email, item);
            }

            // 4. Find nearby devices & match keyword/category alerts
            const locationService = new LocationService();

            const devices = await locationService.getDevicesNearItem(
                item.location.coordinates[0], // lng
                item.location.coordinates[1]  // lat
            );

            if (!devices.length) return;

            const deviceIds = devices.map((d: any) => d.deviceId).filter(Boolean);
            const alerts = await DeviceAlertModel.find({
                status: { $in: ['Active', 'active'] },
                deviceId: { $in: deviceIds }
            });

            console.log(`🎯 Keyword alerts fetched: ${alerts.length}`);

            if (!alerts.length) return;

            const matchedDevices: any[] = [];

            for (const alert of alerts) {
                const match = await OpenAIClient.matchesAlert(item, alert, 0.55);
                if (match) {
                    const dev = devices.find((d: any) => d.deviceId === alert.deviceId);
                    matchedDevices.push({
                        deviceId: alert.deviceId,
                        userId: dev?.user,
                        firebaseToken: alert.firebaseToken || dev?.firebaseToken,
                        distanceInMiles: dev?.distanceInMiles || 0
                    });
                }
            }

            console.log(`🎯 Devices matched by keywords: ${matchedDevices.length}`);

            if (!matchedDevices.length) return;

            const finalDevices = matchedDevices.filter(
                (d) => d.deviceId && d.deviceId !== posterDeviceId
            );
            console.log('📲 Final matched devices for notification:', finalDevices.length);

            for (const d of finalDevices) {
                const distanceText = d.distanceInMiles
                    ? `${d.distanceInMiles.toFixed(1)} miles away`
                    : '';
                const alertTitle = `Gift Alert: ${item.name}`;
                const alertMessage = item.description
                    ? `${item.description} ${distanceText ? `(${distanceText})` : ''}`.trim()
                    : `${item.name} posted near you ${distanceText ? `(${distanceText})` : ''}`.trim();

                // Look up user associated with this device for userId & email
                const matchedUser = await UserModel.findOne({
                    $or: [
                        { deviceId: d.deviceId },
                        ...(d.userId ? [{ _id: d.userId }] : [])
                    ]
                }).lean();

                // A. Send Push Notification if token exists
                if (d.firebaseToken) {
                    await sendBulkPushNotification(
                        [d.firebaseToken],
                        alertTitle,
                        alertMessage,
                        {
                            id: String(item._id),
                            itemId: String(item._id),
                            type: 'New_Item_Alert'
                        }
                    );
                }

                // B. Insert In-App Notification
                await NotificationModels.create({
                    deviceId: d.deviceId,
                    ...(matchedUser?._id || d.userId
                        ? { userId: matchedUser?._id || d.userId }
                        : {}),
                    title: alertTitle,
                    message: alertMessage,
                    type: 'New_Item_Alert',
                    img: defaultImg,
                    data: {
                        itemId: String(item._id),
                        distanceInMiles: d.distanceInMiles
                    }
                });

                // C. Send Email Alert if matched device belongs to a registered user
                if (matchedUser?.email) {
                    await sendNewItemAlertEmail(
                        matchedUser.email,
                        item,
                        d.distanceInMiles
                    );
                }
            }
        } catch (err: any) {
            console.error('❌ Side effect error:', err?.message || err);
        }
    }

    async getItemsNearLocation(deviceId: String, limit: number, offset: number) {
        //getch devie location
        const location = await LocationModel.findOne({ deviceId });

        if (!location) {
            throw new ApiError(404, 'Device not found');
        }

        const { lat, lng, miles } = location;

        // Convert miles to meters
        const maxDistanceMeters = miles * 1609.34; // 1 mile = 1609.34 meters

        // const basePipeline: PipelineStage[] = [
        //     {
        //         $geoNear: {
        //             near: { type: "Point", coordinates: [lng, lat] },
        //             distanceField: "distanceInMeters",
        //             maxDistance: maxDistanceMeters,
        //             spherical: true,
        //             // query: { isTaken: false }

        //             query: {
        //                 isTaken: false,
        //                 takenByDevices: { $ne: deviceId }, // ✅ exclude items taken by this device
        //                 hiddenByDevices: { $ne: deviceId }
        //             }
        //         }
        //     },
        //     { $sort: { distanceInMeters: 1 } },
        //     {
        //         $addFields: {
        //             distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
        //         }
        //     }
        // ];

        const basePipeline: PipelineStage[] = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] },
                    distanceField: "distanceInMeters",
                    maxDistance: maxDistanceMeters,
                    spherical: true,
                    query: {
                        isTaken: false,
                        takenByDevices: { $ne: deviceId },
                        hiddenByDevices: { $ne: deviceId },

                        // 🔥 NEW CONDITION
                        // "reports.deviceId": { $ne: deviceId }

                        reports: {
                            $not: {
                                $elemMatch: { deviceId }
                            }
                        }

                    }
                }
            },
            { $sort: { distanceInMeters: 1 } },
            {
                $addFields: {
                    distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
                }
            }
        ];

        // Get paginated items
        const items = await ItemModel.aggregate([
            ...basePipeline,
            { $skip: offset },
            { $limit: limit }
        ]);

        // Get total count (without skip/limit)
        const totalResult = await ItemModel.aggregate([
            ...basePipeline,
            { $count: "total" }
        ]);

        const total = totalResult[0]?.total || 0;

        return {
            userLocation: {
                deviceId: location.deviceId,
                postcode: location.postCode,
                city: location.city,
                setMile: location.miles
            },

            items: items.map(item => ({
                _id: item._id,
                name: item.name,
                description: item.description,
                partner: item.partner || "Unknown",
                thumbnail: item.imageUrls?.[0] || null,
                visitCount: item.visitCount ?? 0,
                distanceInMeters: item.distanceInMeters ?? 0,
                distanceInMiles: item.distanceInMiles ?? 0,
                isAiSuggested: Boolean(item.isCategorised || (item.visitCount && item.visitCount > 10))
            })),
            total
        };

    }

    async searchItemsNearMe(deviceId: string, keywords: string[], limit: number, offset: number) {
        // 1️⃣ Get device location
        const location = await LocationModel.findOne({ deviceId });
        if (!location) throw new ApiError(404, 'Device not found');

        const { lat, lng, miles } = location;
        const maxDistanceMeters = miles * 1609.34;

        // 2️⃣ Prepare regex array for keywords
        const regexArray = keywords?.map(kw => new RegExp(kw, "i")) || [];

        // 3️⃣ Geo + keyword pipeline
        const pipeline: PipelineStage[] = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] },
                    distanceField: "distanceInMeters",
                    maxDistance: maxDistanceMeters,
                    spherical: true,
                    query: {
                        isTaken: false,
                        $or: [
                            { name: { $in: regexArray } },
                            { description: { $in: regexArray } },
                            { category: { $in: regexArray } },
                            { subCategory: { $in: regexArray } }
                        ]
                    }
                }
            },
            { $sort: { distanceInMeters: 1 } },
            {
                $addFields: {
                    distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
                }
            },
            { $skip: offset },
            { $limit: limit }
        ];

        const items = await ItemModel.aggregate(pipeline);
        return {
            userLocation: {
                deviceId: location.deviceId,
                postcode: location.postCode,
                city: location.city,
                setMile: location.miles
            },
            items: items.map(item => ({
                _id: item._id,
                name: item.name,
                description: item.description,
                category: item.category,
                subCategory: item.subCategory,
                partner: item.partner || "Unknown",
                thumbnail: item.imageUrls?.[0] || item.thumbnail || null,
                visitCount: item.visitCount ?? 0,
                distanceInMeters: item.distanceInMeters ?? 0,
                distanceInMiles: item.distanceInMiles ?? 0,
                isAiSuggested: Boolean(item.isCategorised || (item.visitCount && item.visitCount > 10))
            })),

        }
    }


    private formatToSecond(date: Date): string {
        return date.toISOString().split('.')[0];
    }

    async getTrashNotingItems() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);


        const posts = await TrashNotingApi.fetchUKOffers({
            dateMin: this.formatToSecond(yesterday),//yesterday.toISOString(),
            dateMax: this.formatToSecond(now),//now.toISOString(),
            page: 1,
            perPage: 50
        });

        return posts;

    }

    async getItemById(deviceId: string, itemId: string) {
        const mongoose = require("mongoose");

        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw { statusCode: 400, message: "Invalid item id" };
        }



        //fetch device location to calculate distance
        const deviceLocation = await LocationModel.findOne({ deviceId }).lean();

        if (!deviceLocation) {
            throw { statusCode: 404, message: "Device location not found" };
        }

        const deviceLng = deviceLocation.lng;
        const deviceLat = deviceLocation.lat;


        const result = await ItemModel.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [deviceLng, deviceLat]
                    },
                    distanceField: "distanceInMeters",
                    spherical: true,
                    query: {
                        _id: new mongoose.Types.ObjectId(itemId)
                    }
                }
            },
            {
                $addFields: {
                    distanceInMiles: {
                        $divide: ["$distanceInMeters", 1609.34]
                    }
                }
            }
        ]).then(result => {
            if (!result.length) {
                throw { statusCode: 404, message: "Item not found" };
            }

            return result[0];
        });



        // Increment visit count
        await ItemModel.findByIdAndUpdate(
            itemId,
            { $inc: { visitCount: 1 } },
            { new: true }
        );

        const isTakenForDevice = result.takenByDevices?.includes(deviceId) || false;
        const travelTimes = calculateTravelTimes(result.distanceInMiles);

        return {
            _id: result._id,
            name: result.name,
            description: result.description,
            imageUrls: result.imageUrls || [],
            category: result.category,
            subCategory: result.subCategory,
            location: result.location,
            city: result.city,
            country: result.country,
            pickup: result.pickup,
            isTaken: isTakenForDevice,
            expiration: result.expiration,
            url: result.url,
            partner: result.partner,
            visitCount: result.visitCount ?? 0,
            distanceInMeters: result.distanceInMeters ?? 0,
            distanceInMiles: Number(result.distanceInMiles.toFixed(2)) ?? 0,
            estimatedTravelTime: {
                walking: travelTimes.walking,
                cycling: travelTimes.cycling,
                carPrivate: travelTimes.carPrivate,
                carHire: travelTimes.carHire,
                publicTransport: travelTimes.publicTransport
            },
            createdAt: result.createdAt
        };
    }

    async markItemAsTaken(itemId: string, deviceId: string) {
        const item = await ItemModel.findById(itemId);

        if (!item) {
            return {
                status: false,
                statusCode: 404,
                message: "Item not found"
            };
        }

        // 🚫 If device already took it
        if (item.takenByDevices.includes(deviceId)) {
            return {
                status: false,
                statusCode: 400,
                message: "You have already taken this item"
            };
        }

        // ✅ Add device ID
        item.takenByDevices.push(deviceId);

        // ✅ Mark as taken
        item.isTaken = true;

        await item.save();

        try {
            const posterUser = item.userId ? await UserModel.findById(item.userId) : null;
            await this.sendNotificationToPoster(posterUser, item, {
                requesterDeviceId: deviceId
            });
        } catch (err: any) {
            console.error("⚠️ markItemAsTaken notification error:", err?.message || err);
        }

        return {
            status: true,
            statusCode: 200,
            message: "Item marked as taken successfully"
        };
    }

    async indicateInterest(
        itemId: string,
        userId: string,
        deviceId: string,
        message?: string
    ) {

        const item = await ItemModel.findById(itemId);

        if (!item) {
            return {
                status: false,
                statusCode: 404,
                message: "Item not found"
            };
        }

        // Prevent owner from showing interest
        if (
            item.userId?.toString() === userId ||
            item.deviceId === deviceId
        ) {
            return {
                status: false,
                statusCode: 400,
                message:
                    "You cannot indicate interest in your own item"
            };
        }

        // Check existing interest
        const alreadyInterested =
            item.interestedByDevices.some(
                (interest: any) =>
                    interest.deviceId === deviceId ||
                    interest.userId?.toString() === userId
            );

        if (alreadyInterested) {
            return {
                status: false,
                statusCode: 400,
                message:
                    "You have already indicated interest in this item"
            };
        }

        //fetch poster user id from item model
        const user = item.userId ? await UserModel.findById(item.userId) : null;

        // Add interest
        item.interestedByDevices.push({
            deviceId,
            userId,
            message: message || "",
            createdAt: new Date()
        });

        await item.save();

        await this.sendNotificationToPoster(user, item, {
            requesterDeviceId: deviceId,
            requesterUserId: userId,
            message: message || ""
        });

        return {
            status: true,
            statusCode: 200,
            message:
                "Interest indicated successfully",
            data: item
        };
    }


    async sendNotificationToPoster(
        user: any,
        item: any,
        requesterInfo?: { requesterDeviceId?: string; requesterUserId?: string; message?: string }
    ) {
        try {
            console.log('🚀 Running request notification side effects...');

            const defaultImg =
                item.thumbnail ||
                item.imageUrls?.[0] ||
                'https://res.cloudinary.com/dxfq3iotg/image/upload/v1692099205/giftpose/default-item.png';

            const posterUserId = user?._id || item.userId;
            let posterLocation: any = null;
            if (posterUserId) {
                posterLocation = await LocationModel.findOne({ user: posterUserId }).lean();
            }
            if (!posterLocation && (user?.deviceId || item.deviceId)) {
                posterLocation = await LocationModel.findOne({
                    deviceId: user?.deviceId || item.deviceId
                }).lean();
            }

            const posterDeviceId =
                user?.deviceId ||
                item.deviceId ||
                posterLocation?.deviceId ||
                (posterUserId ? String(posterUserId) : '');

            // 1. In-App Notification for Poster
            if (posterDeviceId) {
                await NotificationModels.create({
                    deviceId: posterDeviceId,
                    ...(posterUserId ? { userId: posterUserId } : {}),
                    title: 'New Item Request',
                    message: `Someone is interested in "${item.name}"`,
                    type: 'Item_Request',
                    img: defaultImg,
                    data: { itemId: String(item._id) }
                });
                console.log('🔔 In-app request notification created for poster');
            }

            // 2. Push Notification for Poster
            const posterAlert = posterDeviceId
                ? await DeviceAlertModel.findOne({ deviceId: posterDeviceId }).lean()
                : null;
            const posterFcmToken =
                posterLocation?.firebaseToken || (posterAlert as any)?.firebaseToken;
            if (posterFcmToken) {
                await sendPushNotification(
                    posterFcmToken,
                    'New Item Request 🔍',
                    `Someone is interested in "${item.name}"`,
                    {
                        id: String(item._id),
                        itemId: String(item._id),
                        type: 'Item_Request'
                    }
                );
            }

            // 3. Email Notification for Poster
            if (user?.email) {
                await sendPostRequestEmail(user.email, item, requesterInfo?.message);
            }

            // 4. In-App Confirmation for Requester
            if (requesterInfo?.requesterDeviceId) {
                await NotificationModels.create({
                    deviceId: requesterInfo.requesterDeviceId,
                    ...(requesterInfo.requesterUserId &&
                    mongoose.Types.ObjectId.isValid(requesterInfo.requesterUserId)
                        ? { userId: new mongoose.Types.ObjectId(requesterInfo.requesterUserId) }
                        : {}),
                    title: 'Request Sent',
                    message: `Your interest in "${item.name}" has been sent to the giver`,
                    type: 'Item_Request',
                    img: defaultImg,
                    data: { itemId: String(item._id) }
                });
            }
        } catch (err: any) {
            console.error('❌ sendNotificationToPoster error:', err?.message || err);
        }
    }


    async hideItem(itemId: string, deviceId: string) {
        const updated = await ItemModel.findByIdAndUpdate(
            itemId,
            {
                $addToSet: {
                    hiddenByDevices: deviceId
                }
            },
            {
                new: true,
                runValidators: false // 🔥 THIS is what you needed
            }
        );

        if (!updated) {
            return {
                status: false,
                statusCode: 404,
                message: "Item not found"
            };
        }

        return {
            status: true,
            statusCode: 200,
            message: "Item hidden successfully"
        };
    }

    async reportItem(itemId: string, deviceId: string, reason: string) {
        if (!deviceId) {
            return {
                status: false,
                statusCode: 400,
                message: "Device ID is required"
            };
        }

        if (!reason) {
            return {
                status: false,
                statusCode: 400,
                message: "Report reason is required"
            };
        }

        const item = await ItemModel.findById(itemId);

        if (!item) {
            return {
                status: false,
                statusCode: 404,
                message: "Item not found"
            };
        }

        // ❌ Check if already reported
        const alreadyReported = item.reports.some(
            (r: any) => r.deviceId === deviceId
        );

        if (alreadyReported) {
            return {
                status: false,
                statusCode: 400,
                message: "You have already reported this item"
            };
        }

        // ✅ Push report
        await ItemModel.findByIdAndUpdate(
            itemId,
            {
                $push: {
                    reports: {
                        deviceId,
                        reason
                    }
                }
            },
            {
                new: true,
                runValidators: false
            }
        );

        return {
            status: true,
            statusCode: 200,
            message: "Item reported successfully"
        };
    }


    async fetchAllItems() {

        const items = await ItemModel
            .find()
            .sort({ createdAt: -1 }) // optional sorting
            .lean();

        return items;
    }


    ///authenticated rouutes

    async getMyItems(userId: string, deviceId: string) {
        const items = await ItemModel.find({
            $or: [
                { userId },
                { deviceId }
            ]
        }).sort({ createdAt: -1 });

        return items;
    }

    async deleteItem(itemId: string, user: any) {
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw new Error("Invalid item ID");
        }
        const item = await ItemModel.findById(itemId);
        if (!item) {
            throw new Error("Item not found");
        }
        if (item.userId && item.userId.toString() !== (user._id || user.id).toString() && item.deviceId !== user.deviceId) {
            throw new Error("Unauthorized");
        }
        await ItemModel.findByIdAndDelete(itemId);
        return { success: true, message: "Item deleted successfully" };
    }
}

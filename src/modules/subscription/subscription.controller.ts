import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { subscriptionService } from "./subscription.service";
import ApiError from "../../utils/ApiError";

const sendError = (res: Response, error: any) => {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: error?.message || "Request failed",
        ...(error?.errors ? { debug: error.errors } : {}),
    });
};

export const create = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const deviceId = req.user?.deviceId || req.body.deviceId;
        const userId = req.user?._id?.toString() || req.body.userId;
        const { plan } = req.body;

        const data = await subscriptionService.createSubscription(
            deviceId,
            userId,
            plan
        );

        return res.status(200).json({
            success: true,
            message: "Subscription created",
            data,
        });
    } catch (error: any) {
        console.error("CREATE SUBSCRIPTION ERROR:", error);
        return sendError(res, error);
    }
};

export const cancel = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const { subscriptionId, cancelImmediately } = req.body;

        if (!subscriptionId?.trim()) {
            throw new ApiError(400, "subscriptionId is required");
        }

        const data = await subscriptionService.cancelSubscription(
            subscriptionId,
            Boolean(cancelImmediately),
            req.user?._id?.toString()
        );

        return res.status(200).json({
            success: true,
            message: "Subscription cancelled",
            data,
        });
    } catch (error: any) {
        console.error("CANCEL SUBSCRIPTION ERROR:", error);
        return sendError(res, error);
    }
};

export const list = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const deviceId = req.user?.deviceId || (req.query.deviceId as string | undefined);
        const userId = req.user?._id?.toString() || (req.query.userId as string | undefined);

        const data = await subscriptionService.getSubscriptions(
            deviceId,
            userId
        );

        return res.status(200).json({
            success: true,
            message: "Subscriptions fetched",
            data,
        });
    } catch (error: any) {
        console.error("LIST SUBSCRIPTIONS ERROR:", error);
        return sendError(res, error);
    }
};

export const getCurrent = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const deviceId = req.user?.deviceId || (req.query.deviceId as string | undefined);
        const userId = req.user?._id?.toString() || (req.query.userId as string | undefined);

        const data = await subscriptionService.getCurrentSubscription(
            deviceId,
            userId
        );

        return res.status(200).json({
            success: true,
            message: "Current subscription fetched",
            data,
        });
    } catch (error: any) {
        console.error("GET CURRENT SUBSCRIPTION ERROR:", error);
        return sendError(res, error);
    }
};

export const updateStatus = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const { subscriptionId, status } = req.body;
        const requesterUserId = req.user?._id?.toString();

        const data = await subscriptionService.updateStatus(
            subscriptionId,
            status,
            requesterUserId
        );

        return res.status(200).json({
            success: true,
            message: "Subscription status updated",
            data,
        });
    } catch (error: any) {
        console.error("UPDATE SUBSCRIPTION STATUS ERROR:", error);
        return sendError(res, error);
    }
};

export const changePlan = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const deviceId = req.user?.deviceId || req.body.deviceId;
        const userId = req.user?._id?.toString();
        const { plan } = req.body;

        

        if (!plan) {
            throw new ApiError(400, "plan is required");
        }

        const data = await subscriptionService.changePlan(
            deviceId,
            plan,
            userId
        );

        return res.status(200).json({
            success: true,
            message: data.message,
            data,
        });
    } catch (error: any) {
        console.error("CHANGE PLAN ERROR:", {
            message: error?.message,
            deviceIdFromUser: req.user?.deviceId ?? null,
            deviceIdFromBody: req.body?.deviceId ?? null,
            userId: req.user?._id?.toString() ?? null,
            email: req.user?.email ?? null,
        });
        return sendError(res, error);
    }
};

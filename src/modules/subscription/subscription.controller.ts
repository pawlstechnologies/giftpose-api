import {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    subscriptionService,
} from "../subscription/subscription.service";




export const create = async (req: any, res: any) => {
    try {
        const {
            deviceId,
            plan,
        } = req.body;

        const data =
            await subscriptionService.createSubscription(
                deviceId,
                plan
            );

        return res.status(200).json({
            success: true,
            message:
                "Subscription created",
            data,
        });

    } catch (error: any) {
        console.error("CREATE SUBSCRIPTION ERROR:", error);

        return res.status(500).send(
            error?.message || "Failed to create subscription"
        );
    }
};



export const cancel = async (req: any, res: any) => {
    try {
        const {
            subscriptionId,
        } = req.body;

        const data =
            await subscriptionService.cancelSubscription(
                subscriptionId
            );

        return res.status(200).json({
            success: true,
            message:
                "Subscription cancelled",
            data,
        });

    } catch (error: any) {
        console.error("CANCEL SUBSCRIPTION ERROR:", error);

        return res.status(500).send(
            error?.message || "Failed to cancel subscription"
        );
    }
};


export const list = async (req: any, res: any) => {
    try {
        const {
            deviceId,
            userId,
        } = req.query;

        const data =
            await subscriptionService.getSubscriptions(
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

        return res.status(500).send(
            error?.message || "Failed to fetch subscriptions"
        );
    }
};

// controller
export const getCurrent = async (req: any, res: any) => {
    try {
        const { deviceId, userId } = req.query;

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
        return res.status(error?.statusCode || 500).send(
            error?.message || "Failed to fetch current subscription"
        );
    }
};





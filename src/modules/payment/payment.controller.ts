import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import ApiError from "../../utils/ApiError";
import { PaymentService } from "./payment.service";

const paymentService = new PaymentService();

const sendError = (res: Response, error: any) => {
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: error?.message || "Request failed",
    });
};

export const createPaymentIntent = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const deviceId = req.user?.deviceId || req.body.deviceId;
        const userId = req.user?._id?.toString();

        if (!deviceId?.trim()) {
            throw new ApiError(400, "Device ID is required");
        }

        const intent = await paymentService.createPaymentIntent(deviceId, userId);

        return res.status(200).json({
            success: true,
            message: "PaymentIntent created successfully",
            data: {
                clientSecret: intent.clientSecret,
            },
        });
    } catch (error: any) {
        console.error("CREATE PAYMENT INTENT ERROR:", error);
        return sendError(res, error);
    }
};

export const listPayments = async (req: AuthRequest<any, any, any>, res: Response) => {
    try {
        const deviceId = req.user?.deviceId || (req.query.deviceId as string | undefined);
        const userId = req.user?._id?.toString() || (req.query.userId as string | undefined);

        const data = await paymentService.getPayments(deviceId, userId);

        return res.status(200).json({
            success: true,
            message: "Payments fetched",
            data,
        });
    } catch (error: any) {
        console.error("LIST PAYMENTS ERROR:", error);
        return sendError(res, error);
    }
};

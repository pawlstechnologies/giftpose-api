import { Request, Response, NextFunction } from "express";
import { LocationService } from '../location/location.service';
import ApiError from "../../utils/ApiError";
import { PaymentService } from "./payment.service";

const locationService = new LocationService();
const paymentService = new PaymentService();

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const deviceId = req.body.deviceId;

    if (!deviceId?.trim()) {
      return res.status(400).json({ message: 'Device ID is required' });
    }

    const intent = await paymentService.createPaymentIntent(deviceId);

    return res.status(200).json({
      success: true,
      message: "PaymentIntent created successfully",
      data: {
        clientSecret: intent.clientSecret,
      },
    });

  } catch (error: any) {
    console.error("CREATE PAYMENT INTENT ERROR:", error);

    return res.status(error?.statusCode || 500).send(
      error?.message || "Failed to create payment intent"
    );
  }
};


export const listPayments = async (req: Request, res: Response) => {
  const { deviceId, userId } = req.query as {
    deviceId?: string;
    userId?: string;
  };

  const data = await paymentService.getPayments(deviceId, userId);

  return res.status(200).json({
    success: true,
    message: "Payments fetched",
    data,
  });
};





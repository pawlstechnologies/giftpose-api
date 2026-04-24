

import { Request, Response, NextFunction } from "express";
import { LocationService } from '../location/location.service';
import ApiError from "../../utils/ApiError";
import { PaymentService } from "./payment.service";

const locationService = new LocationService();
const paymentService = new PaymentService();

export const createPaymentIntent = async (req: Request, res: Response) => {
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

//    res.status(201).json({
//       success: true,
//       message: "Payment intent created successfully",
//       data: intent,
//     });

  // res.json(intent);
};


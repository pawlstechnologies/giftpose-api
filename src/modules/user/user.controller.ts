
// import { Response } from "express";
// import { AuthRequest } from "../../middleware/auth.middleware";



// export const getMe = async (req: AuthRequest, res: Response) => {

//     try {
//       return res.status(200).json({
//         status: true,
//         message: "User Information",
//         user: req.user
//       });
//     } catch (err: any) {
//       return res.status(500).json({
//         message: err.message
//       });
//     }



// }

import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { SubscriptionModel } from "../subscription/subscription.model";
import LocationModel from "../location/location.model";

export const getMe = async (req: AuthRequest, res: Response) => {

    try {

        const deviceId = req.user?.deviceId;

        const [subscription, location] = await Promise.all([
            deviceId
                ? SubscriptionModel.findOne({ deviceId }).sort({ createdAt: -1 })
                : null,

            deviceId
                ? LocationModel.findOne({ deviceId })
                : null,
        ]);

        return res.status(200).json({
            status: true,
            message: "User Information",
            user: req.user,
            subscription: subscription || null,
            adEnabled: location?.adEnabled ?? true,
            isPremium: location?.isPremium ?? false,
        });

    } catch (err: any) {
        return res.status(500).json({
            message: err.message
        });
    }

}
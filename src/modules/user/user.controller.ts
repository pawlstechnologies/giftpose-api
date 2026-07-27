
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
import { subscriptionService } from "../subscription/subscription.service";
import LocationModel from "../location/location.model";

export const getMe = async (req: AuthRequest, res: Response) => {

    try {

        const deviceId = req.user?.deviceId;
        const userId = req.user?._id?.toString();

        const [subscription, location] = await Promise.all([
            subscriptionService.getCurrentSubscription(deviceId, userId)
                .catch(() => null),

            deviceId
                ? LocationModel.findOne({ deviceId })
                : null,
        ]);

        return res.status(200).json({
            status: true,
            message: "User Information",
            adEnabled: location?.adEnabled ?? true,
            isPremium: location?.isPremium ?? false,
            user: req.user,
            subscription: subscription || null,
            
        });

    } catch (err: any) {
        return res.status(500).json({
            message: err.message
        });
    }

}
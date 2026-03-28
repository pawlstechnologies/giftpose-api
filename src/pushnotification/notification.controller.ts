import { Request, Response } from "express";

// import { NotificationModel } from "./notification.model";


// export const getNotifications = async (req: Request, res: Response) => {
//     try {

//         const { deviceId } = req.params;
//         if (!deviceId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Device ID is required",
//             });
//         }

//         const notifications = await NotificationModel.find({ deviceId })
//             .sort({ createdAt: -1 }) // newest first
//             .lean();

//         return res.status(200).json({
//             success: true,
//             data: notifications,
//         });

//     } catch (error: any) {
//         return res.status(500).json({
//             success: false,
//             message: error.message || "Failed to fetch notifications",
//         });
//     }

// };

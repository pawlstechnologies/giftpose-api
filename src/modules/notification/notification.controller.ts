import { Request, Response } from "express";

import NotificationService from "./notification.service";
import { stat } from "node:fs";

interface Params {
  deviceId: string;
}
export const getNotifications = async (req: Request<Params>, res: Response) => {
    try {
        const { deviceId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const data = await NotificationService.getNotifications(
            deviceId,
            Number(limit),
            Number(offset)
        );

        res.status(200).json({
            status: true,
            message: 'Notifications fetched successfully',
            data
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

interface Params {
  notificationId: string;
}

export const markNotificationAsRead = async (req: Request<Params>, res: Response) => {
    try {
        const { notificationId } = req.params;

        const data = await NotificationService.markAsRead(notificationId);

        res.status(200).json({
            status: true,
            message: 'Notification marked as read',
            data
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllNotificationsAsRead = async (req: Request<Params>, res: Response) => {
    try {
        const { deviceId } = req.params;

        const data = await NotificationService.markAllAsRead(deviceId);

        res.status(200).json({
            status: true,
            message: data.message
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
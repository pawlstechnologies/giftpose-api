import NotificationModel from "./notification.models";

class NotificationService {

    async getNotifications(deviceId: string, limit = 20, offset = 0) {
        const notifications = await NotificationModel.find({ deviceId })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean();

        const total = await NotificationModel.countDocuments({ deviceId });
        const unreadCount = await NotificationModel.countDocuments({
            deviceId,
            read: false
        });


        return {
            total,
            unreadCount,
            notifications
        };
    }

    async markAsRead(notificationId: string) {
        const notification = await NotificationModel.findByIdAndUpdate(
            notificationId,
            { read: true },
            { new: true }
        );

        if (!notification) {
            throw new Error('Notification not found');
        }

        return notification;
    }


    async markAllAsRead(deviceId: string) {
        await NotificationModel.updateMany(
            { deviceId, read: false },
            { $set: { read: true } }
        );

        return { message: 'All notifications marked as read' };
    }




}

export default new NotificationService();


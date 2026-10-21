import NotificationModel from "./notification.models";
import LocationModel from "../location/location.model";
import { UserModel } from "../onboarding/auth.model";

class NotificationService {

    private async buildDeviceOrUserQuery(deviceId: string) {
        const orConditions: any[] = [{ deviceId }];

        try {
            const [userDoc, locDoc] = await Promise.all([
                UserModel.findOne({ deviceId }).select("_id").lean(),
                LocationModel.findOne({ deviceId }).select("user").lean(),
            ]);

            const userIds = new Set<string>();
            if (userDoc?._id) userIds.add(String(userDoc._id));
            if ((locDoc as any)?.user) userIds.add(String((locDoc as any).user));

            for (const uid of userIds) {
                orConditions.push({ userId: uid });
            }
        } catch (err) {
            // Ignore lookup error and fallback to deviceId
        }

        return orConditions.length > 1 ? { $or: orConditions } : { deviceId };
    }

    async getNotifications(deviceId: string, limit = 20, offset = 0) {
        const query = await this.buildDeviceOrUserQuery(deviceId);

        const rawNotifications = await NotificationModel.find(query)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean();

        const total = await NotificationModel.countDocuments(query);
        const unreadCount = await NotificationModel.countDocuments({
            ...query,
            read: false
        });

        const notifications = rawNotifications.map((n: any) => ({
            ...n,
            _id: String(n._id),
            deviceId: n.deviceId ? String(n.deviceId) : deviceId,
            userId: n.userId ? String(n.userId) : "",
            title: n.title || "Notification",
            message: n.message || "",
            type: n.type || "New_Item_Alert",
            read: Boolean(n.read),
            img: n.img || "",
            data: {
                ...(n.data || {}),
                itemId: n.data?.itemId ? String(n.data.itemId) : "",
            },
        }));

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
        const query = await this.buildDeviceOrUserQuery(deviceId);
        await NotificationModel.updateMany(
            { ...query, read: false },
            { $set: { read: true } }
        );

        return { message: 'All notifications marked as read' };
    }

}

export default new NotificationService();


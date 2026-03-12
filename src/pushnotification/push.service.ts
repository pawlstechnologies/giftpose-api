import admin from "firebase-admin";
// import { DeviceAlertModel } from "../alerts/alerts.model";
import { DeviceAlertModel } from "../modules/notifications/alerts.model";
// import LocationModel from "../location/location.model";
import LocationModel from "../modules/location/location.mdel";
import { Types } from "mongoose";
import { NotificationModel } from "./notification.model";

export class PushNotificationService {

    async notifyDevicesForItems(items: any[]) {

        if (!items.length) return;

        const alerts = await DeviceAlertModel.find({
            status: "Active"
        }).lean();

        if (!alerts.length) return;

        for (const alert of alerts) {

            const location = await LocationModel
                .findOne({ deviceId: alert.deviceId })
                .lean();

            if (!location) continue;

            const { lat, lng, miles } = location;

            for (const item of items) {

                if (!item.location?.coordinates) continue;

                const [itemLng, itemLat] = item.location.coordinates;

                const distance = this.calculateDistance(
                    lat,
                    lng,
                    itemLat,
                    itemLng
                );

                // skip if outside radius
                if (distance > miles) continue;

                // category match (ObjectId comparison)
                const categoryMatch =
                    alert.categories?.length &&
                    alert.categories.some((catId: Types.ObjectId) =>
                        catId.toString() === item.category?.toString()
                    );

                // keyword match
                const keywordMatch =
                    alert.keywords?.length &&
                    alert.keywords.some((keyword: string) =>
                        item.name?.toLowerCase().includes(keyword.toLowerCase()) ||
                        item.description?.toLowerCase().includes(keyword.toLowerCase())
                    );

                if (!categoryMatch && !keywordMatch) continue;

                console.log(`[CRON] Send in app Notification`);
                await NotificationModel.create({
                    deviceId: alert.deviceId,
                    itemId: item._id,
                    title: item.name,
                    body: item.description,
                    imageUrl: item.imageUrls?.[0] || item.thumbnail || "",
                });

                if (alert.firebaseToken) {
                    console.log(`[CRON] Push alert notification`);
                    await this.sendPush(alert.firebaseToken, item);
                }
                // console.log(`[CRON] Push alert notification`);
                // await this.sendPush(alert.firebaseToken, item);
            }
        }
    }

    async sendPush(token: string, item: any) {

        try {

            await admin.messaging().send({
                token,
                notification: {
                    title: item.name, //"New free item near you 🎁",
                    body: item.description
                },
                data: {
                    itemId: item._id.toString()
                }
            });

            console.log("Push sent to device:", token);

        } catch (error) {

            console.error("Push failed:", error);
        }
    }

    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {

        const R = 3958.8; // miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
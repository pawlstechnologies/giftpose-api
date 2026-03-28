import cron from 'node-cron';

import ItemModel from './item.model';
import TrashNothingApi from '../../utils/trashnothing.api'; //= require('@utils/trashnoting.api');
// import { PushNotificationService } from '../../pushnotification/push.service';
import aiCategorisationService from '../ai/categorisation.service';
import { LocationService } from '../location/location.service';
import { DeviceAlertModel } from '../alerts/alerts.model';
import OpenAIClient from '../../utils/openai.client';
import { sendBulkPushNotification } from '../../utils/push';

import NotificationModels from "../notification/notification.models"; //"../notification/notification.models";


// const pushService = new PushNotificationService();

const formatToSecond = (date: Date): string =>
    date.toISOString().split('.')[0];

class TrashNothingSyncService {
    private lastSync: Date;

    constructor() {
        // Start from 1 minute ago on boot
        this.lastSync = new Date(Date.now() - 60 * 1000);
    }

    // async syncTrashNothing() {
    //     try {
    //         const now = new Date();

    //         console.log('[CRON] Fetching TrashNothing posts...');

    //         const posts = await TrashNothingApi.fetchUKOffers({
    //             dateMin: formatToSecond(this.lastSync),
    //             dateMax: formatToSecond(now),
    //             page: 1,
    //             perPage: 50
    //         });

    //         if (!posts.length) {
    //             console.log('[CRON] No new posts');
    //             this.lastSync = now;
    //             return;
    //         }

    //         const bulkOps = posts.map((post: any) => ({
    //             updateOne: {
    //                 filter: { postId: post.post_id },
    //                 update: {
    //                     $setOnInsert: {
    //                         name: post.title,
    //                         description: post.content,
    //                         imageUrls: post.photos?.map((p: any) => p.url) || [],
    //                         // categoryId: 'Free',
    //                         // subCategoryId: 'TrashNothing',
    //                         // contentId: 'TrashNothing',
    //                         city: '',
    //                         postCode: 'UNKNOWN',
    //                         location: {
    //                             type: 'Point',
    //                             coordinates: [post.longitude, post.latitude]
    //                         },
    //                         partner: 'TrashNothing',
    //                         isTaken: false,
    //                         thumbnail_url: post.thumbnail,
    //                         url: post.url,
    //                         type: post.type,
    //                         pickup: post.pickup,
    //                         country: post.country,
    //                         postId: post.post_id,
    //                         expiration: new Date(post.expiration),
    //                         status: 'Processing', // default value, could change based on business logic
    //                         thumbnail: post.photos?.[0]?.thumbnail || '',
    //                     }
    //                 },
    //                 upsert: true
    //             }
    //         }));

    //         // await ItemModel.bulkWrite(bulkOps);
    //         const result = await ItemModel.bulkWrite(bulkOps);

    //         console.log(`[CRON] Updated ${posts.length} posts`);

    //         /**
    //          * Fetch newly inserted items
    //          */
    //         const newItems = await ItemModel.find({
    //             postId: { $in: posts.map((p: any) => p.post_id) },
    //             isCategorised: false
    //         }).lean();


    //         /**
    //          * Send push notifications
    //          */
    //         if (newItems.length) {
    //             console.log(`[CRON] AI categorising ${newItems.length} items`);

    //              await aiCategorisationService.categoriseItems(newItems);


    //             console.log(`[CRON] Checking alerts and in app notification for ${newItems.length} items`);
    //             // await pushService.notifyDevicesForItems(newItems);

    //             // console.log(`[CRON] `);
    //             // console.log(`[CRON] Creating notifications for ${newItems.length} items`);
    //             // await PushNotificationService.notifyDevicesForItems(newItems);
    //         }

    //         this.lastSync = now;

    //     } catch (error: any) {
    //         console.error('[CRON] Sync failed:', error.message);
    //     }
    // }

    async syncTrashNothing() {
        try {
            const now = new Date();

            console.log('[CRON] Fetching TrashNothing posts...');

            const posts = await TrashNothingApi.fetchUKOffers({
                dateMin: formatToSecond(this.lastSync),
                dateMax: formatToSecond(now),
                page: 1,
                perPage: 50
            });

            if (!posts.length) {
                console.log('[CRON] No new posts');
                this.lastSync = now;
                return;
            }

            const bulkOps = posts.map((post: any) => ({
                updateOne: {
                    filter: { postId: post.post_id },
                    update: {
                        $setOnInsert: {
                            name: post.title,
                            description: post.content,
                            imageUrls: post.photos?.map((p: any) => p.url) || [],
                            city: '',
                            postCode: 'UNKNOWN',
                            location: {
                                type: 'Point',
                                coordinates: [post.longitude, post.latitude]
                            },
                            partner: 'TrashNothing',
                            isTaken: false,
                            thumbnail: post.photos?.[0]?.thumbnail || '',
                            url: post.url,
                            type: post.type,
                            pickup: post.pickup,
                            country: post.country,
                            postId: post.post_id,
                            expiration: new Date(post.expiration),
                            status: 'Processing',
                            isCategorised: false
                        }
                    },
                    upsert: true
                }
            }));

            await ItemModel.bulkWrite(bulkOps);

            console.log(`[CRON] Updated ${posts.length} posts`);

            /**
             * Get new uncategorised items
             */
            const newItems = await ItemModel.find({
                postId: { $in: posts.map((p: any) => p.post_id) },
                isCategorised: false
            }).lean();

            if (!newItems.length) {
                this.lastSync = now;
                return;
            }

            /**
             * AI categorisation
             */
            console.log(`[CRON] AI categorising ${newItems.length} items`);
            await aiCategorisationService.categoriseItems(newItems);

            /**
             * 🔥 NEW: Geo + AI Notifications
             */
            console.log(`[CRON] Running notifications for ${newItems.length} items`);


            const locationService = new LocationService();

            for (const item of newItems) {
                try {
                    console.log(`\n🔔 Processing item: ${item.name}`);

                    // --- 1️⃣ Get nearby devices ---
                    const devices = await locationService.getDevicesNearItem(
                        item.location.coordinates[0],
                        item.location.coordinates[1]
                    );

                    if (!devices.length) {
                        console.log('⚠️ No nearby devices');
                        continue;
                    }

                    console.log(`📡 Nearby devices: ${devices.length}`);

                    // --- 2️⃣ Get alerts ---
                    const deviceIds = devices.map((d: any) => d.deviceId);



                    const alerts = await DeviceAlertModel.find({
                        status: 'Active',
                        deviceId: { $in: deviceIds }
                    });

                    if (!alerts.length) {
                        console.log('⚠️ No alerts found');
                        continue;
                    }

                    console.log(`🎯 Alerts found: ${alerts.length}`);

                    // --- 3️⃣ AI matching ---
                    const itemText = `${item.name} ${item.description || ''}`;

                    const matches = await Promise.all(
                        alerts.map(async (alert) => {
                            const match = await OpenAIClient.isItemMatchingKeywords(
                                itemText,
                                alert.keywords,
                                0.05 // 🔥 slightly relaxed threshold
                            );

                            if (!match) return null;

                            const device = devices.find(
                                (d) => d.deviceId === alert.deviceId
                            );

                            return {
                                deviceId: alert.deviceId,
                                firebaseToken: alert.firebaseToken,
                                distanceInMiles: device?.distanceInMiles || 0
                            };
                        })
                    );

                    const matchedDevices = matches.filter(Boolean) as any[];

                    console.log(`🎯 Matched devices: ${matchedDevices.length}`);

                    if (!matchedDevices.length) continue;

                    // --- 4️⃣ Send push ---
                    const tokens = matchedDevices
                        .map((d) => d.firebaseToken)
                        .filter(Boolean);

                    console.log('📲 Tokens:', tokens);

                    if (tokens.length) {

                        await sendBulkPushNotification(
                            tokens,
                            `${item.name} near you 📍`,
                            `${item.description}`
                        );
                    }

                    // --- 5️⃣ In-app notifications ---
                    for (const d of matchedDevices) {

                        await NotificationModels.create({
                            deviceId: d.deviceId,
                            title: 'New Item Near You',
                            message: `${item.name} is available near you`,
                            data: { itemId: item._id }
                        });
                    }

                    console.log('✅ Notifications sent');

                } catch (err: any) {
                    console.error('❌ Item notification error:', err.message);
                }
            }

            this.lastSync = now;

        } catch (error: any) {
            console.error('[CRON] Sync failed:', error.message);
        }
    }



    start() {
        cron.schedule('* * * * *', async () => {
            await this.syncTrashNothing();
        });

        console.log('🟢 TrashNothing cron started (every minute)');
    }
}

export default new TrashNothingSyncService();

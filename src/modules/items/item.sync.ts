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

const PICKUP_OPTIONS = [
    'Pickup',
    'Personal Delivery',
    'Agent Delivery (payment upon delivery)'
] as const;

const formatToSecond = (date: Date): string =>
    `${date.toISOString().split('.')[0]}Z`;

class TrashNothingSyncService {
    private lastSync: Date;
    private isRunning = false;

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
        if (this.isRunning) {
            console.log('[CRON] Previous sync still running, skipping tick');
            return;
        }

        this.isRunning = true;

        try {
            const now = new Date();

            console.log('[CRON] Fetching TrashNothing posts...');

            const posts = await TrashNothingApi.fetchUKOffers({
                dateMin: formatToSecond(this.lastSync),
                dateMax: formatToSecond(now),
                page: 1,
                perPage: 20
            });

            if (!posts.length) {
                console.log('[CRON] No new posts');
            } else {
                const fallback = await aiCategorisationService.getFallbackTaxonomy();
                const validPosts = posts.filter((post: any) =>
                    Number.isFinite(post.longitude) && Number.isFinite(post.latitude)
                );

                const bulkOps = validPosts.map((post: any) => {
                    const expiration = post.expiration ? new Date(post.expiration) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return {
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
                                    thumbnail: post.photos?.[0]?.thumbnail || post.photos?.[0]?.url || '',
                                    url: post.url,
                                    type: post.type === 'request' ? 'request' : 'offer',
                                    pickup: (PICKUP_OPTIONS as readonly string[]).includes(post.pickup)
                                        ? post.pickup
                                        : 'Pickup',
                                    country: post.country || 'UK',
                                    postId: post.post_id,
                                    expiration: Number.isNaN(expiration.getTime())
                                        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                        : expiration,
                                    status: 'Processing',
                                    isCategorised: false,
                                    categoryId: fallback.category._id,
                                    subCategoryId: fallback.subcategory._id,
                                    contentId: fallback.content._id
                                }
                            },
                            upsert: true
                        }
                    };
                });

                if (bulkOps.length) {
                    await ItemModel.bulkWrite(bulkOps);
                }

                console.log(`[CRON] Updated ${validPosts.length} posts`);
            }

            const maxPerTick = Number(process.env.AI_CATEGORISE_BATCH_SIZE || 8);
            const newItems = await ItemModel.find({
                partner: "TrashNothing",
                isCategorised: false,
            })
                .sort({ createdAt: 1 })
                .limit(maxPerTick)
                .lean();

            if (!newItems.length) {
                this.lastSync = now;
                return;
            }

            console.log(`[CRON] AI categorising ${newItems.length} items`);
            const categorisedItems = await aiCategorisationService.categoriseItems(newItems);

            console.log(`[CRON] Running notifications for ${categorisedItems.length} categorised items`);

            const locationService = new LocationService();

            for (const item of categorisedItems) {
                try {
                    if (!item.location?.coordinates?.length) {
                        continue;
                    }

                    const devices = await locationService.getDevicesNearItem(
                        item.location.coordinates[0],
                        item.location.coordinates[1]
                    );

                    if (!devices.length) {
                        console.log('⚠️ No nearby devices');
                        continue;
                    }

                    const deviceIds = devices.map((d: any) => d.deviceId);
                    const alerts = await DeviceAlertModel.find({
                        status: 'Active',
                        deviceId: { $in: deviceIds }
                    });

                    if (!alerts.length) {
                        console.log('⚠️ No alerts found');
                        continue;
                    }

                    const matches = await Promise.all(
                        alerts.map(async (alert) => {
                            const match = await OpenAIClient.matchesAlert(item, alert);

                            if (!match) return null;

                            const device = devices.find(
                                (d: any) => d.deviceId === alert.deviceId
                            );

                            return {
                                deviceId: alert.deviceId,
                                firebaseToken: alert.firebaseToken,
                                distanceInMiles: device?.distanceInMiles || 0
                            };
                        })
                    );

                    const matchedDevices = matches.filter(Boolean) as any[];

                    if (!matchedDevices.length) continue;

                    const tokens = matchedDevices
                        .map((d) => d.firebaseToken)
                        .filter(Boolean);

                    if (tokens.length) {
                        await sendBulkPushNotification(
                            tokens,
                            `${item.name} near you 📍`,
                            `${item.description || ''}`.trim()
                        );
                    }

                    const img = item.thumbnail || item.imageUrls?.[0] || '';

                    for (const d of matchedDevices) {
                        await NotificationModels.create({
                            deviceId: d.deviceId,
                            title: 'New Item Near You',
                            message: `${item.name} is available near you`,
                            type: 'New_Item_Alert',
                            img,
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
        } finally {
            this.isRunning = false;
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

import cron from 'node-cron';

import ItemModel from './item.model';
import TrashNothingApi from '../../utils/trashnothing.api'; //= require('@utils/trashnoting.api');




const formatToSecond = (date: Date): string =>
    date.toISOString().split('.')[0];

class TrashNothingSyncService {
    private lastSync: Date;

    constructor() {
        // Start from 1 minute ago on boot
        this.lastSync = new Date(Date.now() - 60 * 1000);
    }

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
                            category: 'Free',
                            subCategory: 'TrashNothing',
                            city: '',
                            postCode: 'UNKNOWN',
                            location: {
                                type: 'Point',
                                coordinates: [post.longitude, post.latitude]
                            },
                            partner: 'TrashNothing',
                            isTaken: false,
                            thumbnail_url: post.thumbnail,
                            url: post.url,
                            type: post.type,
                            pickup: post.pickup,
                            country: post.country,
                            postId: post.post_id,
                            expiration: new Date(post.expiration),
                            status: 'Processing', // default value, could change based on business logic
                            thumbnail: post.photos?.[0]?.thumbnail || '',
                        }
                    },
                    upsert: true
                }
            }));

            await ItemModel.bulkWrite(bulkOps);

            console.log(`[CRON] Updated ${posts.length} posts`);

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

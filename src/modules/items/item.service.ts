import mongoose from "mongoose";
import axios from 'axios';
import ItemModel from './item.model';
import { ItemInterface } from './item.types';
import ApiError from '../../utils/ApiError';
import { PipelineStage } from 'mongoose';

import LocationModel from '../location/location.mdel';
import TrashNotingApi from '../../utils/trashnothing.api';
import { getDistancebetweenCoordinates, calculateTravelTimes } from '../../utils/distance';
import OpenAIClient from "../../utils/openai.client";
import { CategoryModel } from "../category/category.model";
import { SubCategoryModel } from "../category/category.model";
import { ContentModel } from "../category/category.model";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { sendPostCreatedEmail } from "../../utils/email";
import NotificationModels from "../notification/notification.models";
import { LocationService } from "../location/location.service";
import { sendBulkPushNotification } from "../../utils/push";
import OpenAI from "openai";
import { DeviceAlertModel } from "../alerts/alerts.model";



export default class ItemService {
    async createItem(data: ItemInterface) {
        if (!data.lng || !data.lat) {
            throw new ApiError(413, 'Latitude and longitude are required');
        }

        const item = await ItemModel.create({
            ...data,
            location: {
                type: 'Point',
                coordinates: [data.lng, data.lat]
            }
        });

        return item;

    }

    async analyseImage(files: Express.Multer.File[]) {

        if (!files || files.length === 0) {
            throw new ApiError(413, 'Images are required, upload atleast one image');
        }

        // 🔥 1. Upload all images to Cloudinary
        const imageUrls: string[] = [];
        for (const file of files) {
            const url = await uploadToCloudinary(file.path);
            imageUrls.push(url);
        }

        const taxonomy = await this.getTaxonomy();

        // 🔥 Combine images into one AI request
        const ai = await OpenAIClient.imageCategorisatiion(
            {
                title: "",
                description: "",
                images: imageUrls
            },
            taxonomy //await this.getTaxonomy()
        );
        // 🔹 Map AI outputs to DB IDs (if they exist)
        let category = await CategoryModel.findOne({ name: ai.category });
        let subcategory = await SubCategoryModel.findOne({ name: ai.subcategory });
        let content = await ContentModel.findOne({ name: ai.content });


        // 🔥 HANDLE SUGGESTED CATEGORY
        let suggestedCategoryDoc = null;
        if (!category && ai.suggestedCategory) {
            suggestedCategoryDoc = await CategoryModel.findOne({ name: ai.suggestedCategory.trim() });
            if (!suggestedCategoryDoc) {
                suggestedCategoryDoc = new CategoryModel({ name: ai.suggestedCategory.trim() });
                await suggestedCategoryDoc.save(); // ✅ triggers pre-save slug
            }
        }


        // 🔹 Suggested SubCategory
        let suggestedSubcategoryDoc = null;
        if (!subcategory && ai.suggestedSubcategory && suggestedCategoryDoc) {
            suggestedSubcategoryDoc = await SubCategoryModel.findOne({
                name: ai.suggestedSubcategory.trim(),
                categoryId: suggestedCategoryDoc._id
            });

            if (!suggestedSubcategoryDoc) {
                suggestedSubcategoryDoc = new SubCategoryModel({
                    name: ai.suggestedSubcategory.trim(),
                    categoryId: suggestedCategoryDoc._id
                });
                await suggestedSubcategoryDoc.save(); // ✅ triggers slug
            }
        }

        // 🔹 Suggested Content
        let suggestedContentDoc = null;
        if (!content && ai.suggestedContent && suggestedSubcategoryDoc) {
            suggestedContentDoc = await ContentModel.findOne({
                name: ai.suggestedContent.trim(),
                subcategoryId: suggestedSubcategoryDoc._id
            });

            if (!suggestedContentDoc) {
                suggestedContentDoc = new ContentModel({
                    name: ai.suggestedContent.trim(),
                    subcategoryId: suggestedSubcategoryDoc._id
                });
                await suggestedContentDoc.save(); // ✅ triggers slug
            }
        }

        return {
            name: ai.title || ai.content || "Generated Item",
            description: ai.description || ai.content,

            category: category
                ? {
                    _id: category._id,
                    name: category.name,
                    slug: category.slug,
                    status: category.status,

                    subcategories: subcategory
                        ? [
                            {
                                _id: subcategory._id,
                                name: subcategory.name,
                                categoryId: subcategory.categoryId,
                                status: subcategory.status,
                                slug: subcategory.slug,

                                contents: content
                                    ? [
                                        {
                                            _id: content._id,
                                            name: content.name,
                                            status: content.status,
                                            subcategoryId: content.subcategoryId,
                                            slug: content.slug
                                        }
                                    ]
                                    : []
                            }
                        ]
                        : []
                }
                : null,

            // 🔥 Suggested (same structure)
            suggestedCategory: suggestedCategoryDoc
                ? {
                    _id: suggestedCategoryDoc._id,
                    name: suggestedCategoryDoc.name,
                    slug: suggestedCategoryDoc.slug,
                    status: suggestedCategoryDoc.status,

                    subcategories: suggestedSubcategoryDoc
                        ? [
                            {
                                _id: suggestedSubcategoryDoc._id,
                                name: suggestedSubcategoryDoc.name,
                                categoryId: suggestedSubcategoryDoc.categoryId,
                                status: suggestedSubcategoryDoc.status,
                                slug: suggestedSubcategoryDoc.slug,

                                contents: suggestedContentDoc
                                    ? [
                                        {
                                            _id: suggestedContentDoc._id,
                                            name: suggestedContentDoc.name,
                                            status: suggestedContentDoc.status,
                                            subcategoryId: suggestedContentDoc.subcategoryId,
                                            slug: suggestedContentDoc.slug
                                        }
                                    ]
                                    : []
                            }
                        ]
                        : []
                }
                : null,

            images: imageUrls
        };



        // return {
        //     name: ai.title || ai.content || "Generated Item",
        //     description: ai.description || ai.content,

        //     category: ai.category || "",
        //     categoryId: category?._id || null,

        //     subcategory: ai.subcategory || "",
        //     subcategoryId: subcategory?._id || null,

        //     content: ai.content || "",
        //     contentId: content?._id || null,


        //     // suggestedCategory: ai.suggestedCategory || "",
        //     // suggestedSubcategory: ai.suggestedSubcategory || "",
        //     // suggestedContent: ai.suggestedContent || "",


        //     suggestedCategory: ai.suggestedCategory || "",
        //     suggestedCategoryId: suggestedCategoryDoc?._id || null,

        //     suggestedSubcategory: ai.suggestedSubcategory || "",
        //     suggestedSubcategoryId: suggestedSubcategoryDoc?._id || null,

        //     suggestedContent: ai.suggestedContent || "",
        //     suggestedContentId: suggestedContentDoc?._id || null,

        //     images: imageUrls
        // };

    }


    async postItem(data: any, file: any, user: any) {

        const {
            name,
            description,
            categoryId,
            subcategoryId,
            contentId,
            suggestedCategoryId,
            suggestedSubcategoryId,
            suggestedContentId,
            imageUrls,
            postCode,
            country } = data;

        const finalCategoryId = categoryId || suggestedCategoryId;
        const finalSubcategoryId = subcategoryId || suggestedSubcategoryId;
        const finalContentId = contentId || suggestedContentId;

        if (!finalCategoryId || !finalSubcategoryId || !finalContentId) {
            throw new Error('Invalid category structure');
        }

        if (!mongoose.Types.ObjectId.isValid(finalCategoryId)) {
            throw new Error('Invalid category ID');
        }

        if (!mongoose.Types.ObjectId.isValid(finalSubcategoryId)) {
            throw new Error('Invalid subcategory ID');
        }

        if (!mongoose.Types.ObjectId.isValid(finalContentId)) {
            throw new Error('Invalid content ID');
        }


        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            throw new Error('Google Maps API key is not configured');
        }

        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            {
                params: { address: postCode, key: apiKey }
            }
        );

        const geoData = response.data;

        if (geoData.status !== 'OK' || !geoData.results.length) {
            throw new Error('Location not found for the provided postcode');
        }

        const result = geoData.results[0];
        const location = result.geometry.location;

        const cityComponent = result.address_components.find((comp: any) =>
            comp.types.includes('locality') ||
            comp.types.includes('postal_town')
        );

        const city = cityComponent?.long_name || '';


        // const userId = user._id;
        // const deviceId = user.deviceId;


        // 🔥 3. Create item
        const item = await ItemModel.create({
            userId: user._id,

            name,
            description,
            imageUrls,

            categoryId: finalCategoryId,
            subCategoryId: finalSubcategoryId,
            contentId: finalContentId,

            isCategorised: true,

            city,
            postCode,
            country,

            location: {
                type: 'Point',
                coordinates: [location.lng, location.lat]
            },

            partner: 'Gifpose', ///user.email,

            expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

            postId: Date.now() + Math.floor(Math.random() * 1000),

            status: 'Live',
            type: "offer",

            thumbnail: imageUrls?.[0] || ''
        });

        // setImmediate(async () => {
        //     try {
        //         await this.handlePostSideEffects(user, item);
        //     } catch (err) {
        //         console.error('❌ Side effect error:', err);
        //     }
        // });



        await this.handlePostSideEffects(user, item);

        return item;

    }

    async getTaxonomy() {

        // const categories = await CategoryModel.find().lean();
        // const subcategories = await SubCategoryModel.find().lean();
        // const contents = await ContentModel.find().lean();

        const categories = await CategoryModel.find({}, { name: 1 }).lean();
        const subcategories = await SubCategoryModel.find({}, { name: 1, categoryId: 1 }).lean();
        const contents = await ContentModel.find({}, { name: 1, subcategoryId: 1 }).lean();

        return {
            categories,
            subcategories,
            contents
        };
    }




    async handlePostSideEffects(user: any, item: any) {
        try {

            console.log('🚀 Running post side effects...');

            //notify user in-app notification
            await NotificationModels.create({
                deviceId: user.deviceId,
                userId: user._id,
                title: 'Item Posted',
                message: `${item.name} is now live`,
                type: 'Item_Posted',
                img: item.thumbnail || 'https://res.cloudinary.com/dxfq3iotg/image/upload/v1692099205/giftpose/default-item.png',
                data: { itemId: item._id }
            });
            console.log('🔔 In-app notification created');


            //notify user by email 
            await sendPostCreatedEmail(user.email, item);

            console.log('📧 Email sent to:', user.email);



            const locationService = new LocationService();

            const devices = await locationService.getDevicesNearItem(
                item.location.coordinates[0], // lng
                item.location.coordinates[1]  // lat
            );


            if (!devices.length) return;
            //fetch keywords
            const deviceIds = devices.map((d: any) => d.deviceId);
            const alerts = await DeviceAlertModel.find({
                status: 'Active',
                deviceId: { $in: deviceIds }
            });

            console.log(`🎯 Keyword alerts fetched: ${alerts.length}`);

            if (!alerts.length) return;


            // --- 4️⃣ AI semantic matching ---
            const matchedDevices: any[] = [];
            const itemText = `${item.name} ${item.description || ''}`;

            for (const alert of alerts) {
                const match = await OpenAIClient.isItemMatchingKeywords(itemText, alert.keywords, 0.6);
                if (match) {
                    matchedDevices.push({
                        deviceId: alert.deviceId,
                        firebaseToken: alert.firebaseToken,
                        distanceInMiles: devices.find(d => d.deviceId === alert.deviceId)?.distanceInMiles || 0
                    });
                }
            }

            console.log(`🎯 Devices matched by keywords: ${matchedDevices.length}`);

            if (!matchedDevices.length) return;


            const finalDevices = matchedDevices.filter(d => d.deviceId !== user.deviceId);
            const tokens = finalDevices.map(d => d.firebaseToken).filter(Boolean);

            // const tokens = devices.filter(d => d.deviceId !== user.deviceId).map(d => d.firebaseToken); ///remove user
            // const tokens = devices.map((d: any) => d.firebaseToken);

            console.log('📲 Final tokens:', tokens);
            for (const d of finalDevices) {
                const distanceText = d.distanceInMiles ? `${d.distanceInMiles.toFixed(1)} miles away` : '';
                await sendBulkPushNotification(
                    [d.firebaseToken],
                    `${item.name} posted near you 📍`,
                    `${item.description} ${distanceText}`
                );
            }


            // await sendBulkPushNotification(
            //     tokens,
            //     // '${item.name} Item Near You 📍',
            //     `${item.name} posted near you 📍`,
            //     `${item.description}`
            // );

        } catch (err: any) {
            console.error('❌ Side effect error:', err.message);
        }

    }




    async getItemsNearLocation(deviceId: String, limit: number, offset: number) {
        //getch devie location
        const location = await LocationModel.findOne({ deviceId });

        if (!location) {
            throw new ApiError(404, 'Device not found');
        }

        const { lat, lng, miles } = location;

        // Convert miles to meters
        const maxDistanceMeters = miles * 1609.34; // 1 mile = 1609.34 meters

        // const basePipeline: PipelineStage[] = [
        //     {
        //         $geoNear: {
        //             near: { type: "Point", coordinates: [lng, lat] },
        //             distanceField: "distanceInMeters",
        //             maxDistance: maxDistanceMeters,
        //             spherical: true,
        //             // query: { isTaken: false }

        //             query: {
        //                 isTaken: false,
        //                 takenByDevices: { $ne: deviceId }, // ✅ exclude items taken by this device
        //                 hiddenByDevices: { $ne: deviceId }
        //             }
        //         }
        //     },
        //     { $sort: { distanceInMeters: 1 } },
        //     {
        //         $addFields: {
        //             distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
        //         }
        //     }
        // ];

        const basePipeline: PipelineStage[] = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] },
                    distanceField: "distanceInMeters",
                    maxDistance: maxDistanceMeters,
                    spherical: true,
                    query: {
                        isTaken: false,
                        takenByDevices: { $ne: deviceId },
                        hiddenByDevices: { $ne: deviceId },

                        // 🔥 NEW CONDITION
                        // "reports.deviceId": { $ne: deviceId }

                        reports: {
                            $not: {
                                $elemMatch: { deviceId }
                            }
                        }

                    }
                }
            },
            { $sort: { distanceInMeters: 1 } },
            {
                $addFields: {
                    distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
                }
            }
        ];

        // Get paginated items
        const items = await ItemModel.aggregate([
            ...basePipeline,
            { $skip: offset },
            { $limit: limit }
        ]);

        // Get total count (without skip/limit)
        const totalResult = await ItemModel.aggregate([
            ...basePipeline,
            { $count: "total" }
        ]);

        const total = totalResult[0]?.total || 0;

        return {
            userLocation: {
                deviceId: location.deviceId,
                postcode: location.postCode,
                city: location.city,
                setMile: location.miles
            },

            items: items.map(item => ({
                _id: item._id,
                name: item.name,
                description: item.description,
                partner: item.partner || "Unknown",
                thumbnail: item.imageUrls?.[0] || null,
                visitCount: item.visitCount ?? 0,
                distanceInMeters: item.distanceInMeters ?? 0,
                distanceInMiles: item.distanceInMiles ?? 0
            })),
            total
        };

    }

    // async searchItemsNearMe(deviceId: string, keywords: string[], limit: number, offset: number) {
    //     // Get device location
    //     const location = await LocationModel.findOne({ deviceId });
    //     if (!location) {
    //         throw new ApiError(404, 'Device not found');
    //     }

    //     const { lat, lng, miles } = location;

    //     // Convert miles to meters
    //     const maxDistanceMeters = miles * 1609.34;

    //     // Prepare regex for keywords search
    //     const regexArray = keywords?.map(kw => new RegExp(kw, "i")) || [];

    //     // Base pipeline for geo query
    //     const basePipeline: PipelineStage[] = [
    //         {
    //             $geoNear: {
    //                 near: { type: "Point", coordinates: [lng, lat] },
    //                 distanceField: "distanceInMeters",
    //                 maxDistance: maxDistanceMeters,
    //                 spherical: true,
    //                 query: {
    //                     isTaken: false,
    //                     $or: [
    //                         { name: { $in: regexArray } },
    //                         { description: { $in: regexArray } },
    //                         { category: { $in: regexArray } },
    //                         { subCategory: { $in: regexArray } },
    //                     ]
    //                 }
    //             }
    //         },
    //         { $sort: { distanceInMeters: 1 } },
    //         {
    //             $addFields: {
    //                 distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
    //             }
    //         }
    //     ];

    //     // Paginated results
    //     const items = await ItemModel.aggregate([
    //         ...basePipeline,
    //         { $skip: offset },
    //         { $limit: limit }
    //     ]);

    //     // Total count without skip/limit
    //     const totalResult = await ItemModel.aggregate([
    //         ...basePipeline,
    //         { $count: "total" }
    //     ]);
    //     const total = totalResult[0]?.total || 0;

    //     return {
    //         userLocation: {
    //             deviceId: location.deviceId,
    //             postcode: location.postCode,
    //             city: location.city,
    //             setMile: location.miles
    //         },
    //         items: items.map(item => ({
    //             _id: item._id,
    //             name: item.name,
    //             description: item.description,
    //             category: item.category,
    //             subCategory: item.subCategory,
    //             partner: item.partner || "Unknown",
    //             thumbnail: item.imageUrls?.[0] || item.thumbnail || null,
    //             visitCount: item.visitCount ?? 0,
    //             distanceInMeters: item.distanceInMeters ?? 0,
    //             distanceInMiles: item.distanceInMiles ?? 0
    //         })),
    //         total
    //     };
    // }

    async searchItemsNearMe(deviceId: string, keywords: string[], limit: number, offset: number) {
        // 1️⃣ Get device location
        const location = await LocationModel.findOne({ deviceId });
        if (!location) throw new ApiError(404, 'Device not found');

        const { lat, lng, miles } = location;
        const maxDistanceMeters = miles * 1609.34;

        // 2️⃣ Prepare regex array for keywords
        const regexArray = keywords?.map(kw => new RegExp(kw, "i")) || [];

        // 3️⃣ Geo + keyword pipeline
        const pipeline: PipelineStage[] = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] },
                    distanceField: "distanceInMeters",
                    maxDistance: maxDistanceMeters,
                    spherical: true,
                    query: {
                        isTaken: false,
                        $or: [
                            { name: { $in: regexArray } },
                            { description: { $in: regexArray } },
                            { category: { $in: regexArray } },
                            { subCategory: { $in: regexArray } }
                        ]
                    }
                }
            },
            { $sort: { distanceInMeters: 1 } },
            {
                $addFields: {
                    distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
                }
            },
            { $skip: offset },
            { $limit: limit }
        ];

        const items = await ItemModel.aggregate(pipeline);
        return {
            userLocation: {
                deviceId: location.deviceId,
                postcode: location.postCode,
                city: location.city,
                setMile: location.miles
            },
            items: items.map(item => ({
                _id: item._id,
                name: item.name,
                description: item.description,
                category: item.category,
                subCategory: item.subCategory,
                partner: item.partner || "Unknown",
                thumbnail: item.imageUrls?.[0] || item.thumbnail || null,
                visitCount: item.visitCount ?? 0,
                distanceInMeters: item.distanceInMeters ?? 0,
                distanceInMiles: item.distanceInMiles ?? 0
            })),

        }
    }


    private formatToSecond(date: Date): string {
        return date.toISOString().split('.')[0];
    }

    async getTrashNotingItems() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);


        const posts = await TrashNotingApi.fetchUKOffers({
            dateMin: this.formatToSecond(yesterday),//yesterday.toISOString(),
            dateMax: this.formatToSecond(now),//now.toISOString(),
            page: 1,
            perPage: 50
        });

        return posts;

    }

    async getItemById(deviceId: string, itemId: string) {
        const mongoose = require("mongoose");

        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw { statusCode: 400, message: "Invalid item id" };
        }



        //fetch device location to calculate distance
        const deviceLocation = await LocationModel.findOne({ deviceId }).lean();

        if (!deviceLocation) {
            throw { statusCode: 404, message: "Device location not found" };
        }

        const deviceLng = deviceLocation.lng;
        const deviceLat = deviceLocation.lat;


        const result = await ItemModel.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [deviceLng, deviceLat]
                    },
                    distanceField: "distanceInMeters",
                    spherical: true,
                    query: {
                        _id: new mongoose.Types.ObjectId(itemId)
                    }
                }
            },
            {
                $addFields: {
                    distanceInMiles: {
                        $divide: ["$distanceInMeters", 1609.34]
                    }
                }
            }
        ]).then(result => {
            if (!result.length) {
                throw { statusCode: 404, message: "Item not found" };
            }

            return result[0];
        });



        // Increment visit count
        await ItemModel.findByIdAndUpdate(
            itemId,
            { $inc: { visitCount: 1 } },
            { new: true }
        );

        const isTakenForDevice = result.takenByDevices?.includes(deviceId) || false;
        const travelTimes = calculateTravelTimes(result.distanceInMiles);

        return {
            _id: result._id,
            name: result.name,
            description: result.description,
            imageUrls: result.imageUrls || [],
            category: result.category,
            subCategory: result.subCategory,
            location: result.location,
            city: result.city,
            country: result.country,
            pickup: result.pickup,
            isTaken: isTakenForDevice,
            expiration: result.expiration,
            url: result.url,
            partner: result.partner,
            visitCount: result.visitCount ?? 0,
            distanceInMeters: result.distanceInMeters ?? 0,
            distanceInMiles: Number(result.distanceInMiles.toFixed(2)) ?? 0,
            estimatedTravelTime: {
                walking: travelTimes.walking,
                cycling: travelTimes.cycling,
                carPrivate: travelTimes.carPrivate,
                carHire: travelTimes.carHire,
                publicTransport: travelTimes.publicTransport
            },
            createdAt: result.createdAt
        };
    }

    async markItemAsTaken(itemId: string, deviceId: string) {
        const item = await ItemModel.findById(itemId);

        if (!item) {
            return {
                status: false,
                statusCode: 404,
                message: "Item not found"
            };
        }

        // 🚫 If device already took it
        if (item.takenByDevices.includes(deviceId)) {
            return {
                status: false,
                statusCode: 400,
                message: "You have already taken this item"
            };
        }

        // ✅ Add device ID
        item.takenByDevices.push(deviceId);

        // ✅ Mark as taken
        item.isTaken = true;

        await item.save();

        return {
            status: true,
            statusCode: 200,
            message: "Item marked as taken successfully"
        };
    }

    async hideItem(itemId: string, deviceId: string) {
        const updated = await ItemModel.findByIdAndUpdate(
            itemId,
            {
                $addToSet: {
                    hiddenByDevices: deviceId
                }
            },
            {
                new: true,
                runValidators: false // 🔥 THIS is what you needed
            }
        );

        if (!updated) {
            return {
                status: false,
                statusCode: 404,
                message: "Item not found"
            };
        }

        return {
            status: true,
            statusCode: 200,
            message: "Item hidden successfully"
        };
    }

    async reportItem(itemId: string, deviceId: string, reason: string) {
        if (!deviceId) {
            return {
                status: false,
                statusCode: 400,
                message: "Device ID is required"
            };
        }

        if (!reason) {
            return {
                status: false,
                statusCode: 400,
                message: "Report reason is required"
            };
        }

        const item = await ItemModel.findById(itemId);

        if (!item) {
            return {
                status: false,
                statusCode: 404,
                message: "Item not found"
            };
        }

        // ❌ Check if already reported
        const alreadyReported = item.reports.some(
            (r: any) => r.deviceId === deviceId
        );

        if (alreadyReported) {
            return {
                status: false,
                statusCode: 400,
                message: "You have already reported this item"
            };
        }

        // ✅ Push report
        await ItemModel.findByIdAndUpdate(
            itemId,
            {
                $push: {
                    reports: {
                        deviceId,
                        reason
                    }
                }
            },
            {
                new: true,
                runValidators: false
            }
        );

        return {
            status: true,
            statusCode: 200,
            message: "Item reported successfully"
        };
    }


    async fetchAllItems() {

        const items = await ItemModel
            .find()
            .sort({ createdAt: -1 }) // optional sorting
            .lean();

        return items;
    }




}

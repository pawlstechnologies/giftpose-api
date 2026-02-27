import mongoose from "mongoose";
import ItemModel from './item.model';
import { ItemInterface } from './item.types';
import ApiError from '../../utils/ApiError';
import { PipelineStage } from 'mongoose';

import LocationModel from '../location/location.mdel';
import TrashNotingApi from '../../utils/trashnothing.api';
import { getDistancebetweenCoordinates, calculateTravelTimes } from '../../utils/distance';

export default class ItemService {
    async createItem(data: ItemInterface) {
        if (!data.lng || !data.lat) {
            throw new ApiError(400, 'Latitude and longitude are required');
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


    async getItemsNearLocation(deviceId: String, limit: number, offset: number) {
        //getch devie location
        const location = await LocationModel.findOne({ deviceId });

        if (!location) {
            throw new ApiError(404, 'Device not found');
        }

        const { lat, lng, miles } = location;

        // Convert miles to meters
        const maxDistanceMeters = miles * 1609.34; // 1 mile = 1609.34 meters

        const basePipeline: PipelineStage[] = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] },
                    distanceField: "distanceInMeters",
                    maxDistance: maxDistanceMeters,
                    spherical: true,
                    query: { isTaken: false }
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




}

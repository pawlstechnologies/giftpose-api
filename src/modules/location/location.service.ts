import axios from "axios";
import { LocationInterface } from "./location.types";
import LocationModel from "./location.model";
import ApiError from '../../utils/ApiError';


import { getDistancebetweenCoordinates } from "../../utils/distance";


export class LocationService {
    async getLocationByPostcode(
        firebaseToken: string,
        postCode: string,
        deviceId: string,
        miles: number
    ): Promise<LocationInterface> {

        if (!firebaseToken?.trim()) {
            throw new ApiError(400, 'Firebase Token is required');
        }

        if (!postCode?.trim()) {
            throw new ApiError(400, 'Postcode is required');
        }

        if (!deviceId?.trim()) {
            throw new ApiError(400, 'Device ID is required');
        }

        if (!miles || miles <= 0) {
            throw new ApiError(400, 'Miles travel is required');
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            throw new ApiError(500, 'Google Maps API key is not configured');
        }

        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            { params: { address: postCode, key: apiKey } }
        );

        const data = response.data;

        // console.log('📍 Geocoding response:', data);

        if (data.status !== 'OK' || !data.results.length) {
            throw new ApiError(404, 'There was an issue fetching the location, please try again later');
        }

        const result = data.results[0];
        const location = result.geometry.location;

        const cityComponent = result.address_components.find((comp: any) =>
            comp.types.includes('locality') ||
            comp.types.includes('postal_town')
        );

        const locationData = {
            firebaseToken,
            deviceId,
            postCode,
            lng: location.lng,
            lat: location.lat,
            city: cityComponent?.long_name || '',
            address: result.formatted_address || '',
            miles,
            location: {
                type: 'Point',
                coordinates: [location.lng, location.lat]
            }
        };

        const savedLocation = await LocationModel.findOneAndUpdate(
            { deviceId },
            locationData,
            { new: true, upsert: true, runValidators: true }
        );

        return savedLocation.toObject();
    }

    async getDevicesNearItem(lng: number, lat: number) {

        //const maxDistanceMeters =  radiusMiles * 1609.34;

        console.log('📍 Finding devices near:', { lng, lat });


        const MAX_RADIUS_MILES = 50;
        const maxDistanceMeters = MAX_RADIUS_MILES * 1609.34;

        const devices = await LocationModel.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] },
                    distanceField: "distanceInMeteres",
                    maxDistance: maxDistanceMeters,
                    spherical: true
                }
            },
            {
                $match: {
                    firebaseToken: { $exists: true, $ne: null }
                }
            },
            {
                $addFields: {
                    distanceInMiles: { $divide: ["$distanceInMeters", 1609.34] }
                }
            },
            {
                $project: {
                    firebaseToken: 1,
                    deviceId: 1,
                    distanceInMiles: 1,
                    miles: 1 // user preference
                }
            }
        ]);

        console.log(`📡 Devices found (before filtering): ${devices.length}`);

        devices.forEach((d: any) => {
            if (!d.distanceInMiles) {
                console.log(`⚠️ Device ${d.deviceId} missing distance`);
                return;
            }

            console.log(
                `➡️ Device ${d.deviceId} | Distance: ${d.distanceInMiles.toFixed(2)} miles | Radius: ${d.miles}`
            );
        });



        const filteredDevices = devices.filter((device: any) => {
            return device.distanceInMiles <= (device.miles || 10);
        });

        console.log(`🎯 Devices after radius filter: ${filteredDevices.length}`);

        return filteredDevices;
        // return devices;


    }

   async getLocationByDeviceId(deviceId: string): Promise<LocationInterface> {
        const location = await LocationModel.findOne({ deviceId });
        if (!location) {
            throw new ApiError(404, 'Location not found for the provided device ID');
        }
        return location.toObject();
    }   


    async calculateDistance(postCode1: string, postCode2: string): Promise<number> {
        const normalize = (p: string) => p.trim().toUpperCase();

        const location1 = await LocationModel.findOne({ postCode: normalize(postCode1) });
        const location2 = await LocationModel.findOne({ postCode: normalize(postCode2) });

        if (!location1 || !location2) {
            throw new ApiError(404, 'One or both postcodes not found in database');
        }

        const distance = getDistancebetweenCoordinates(
            location1.lat,
            location1.lng,
            location2.lat,
            location2.lng,
            'mi'
        );

        return distance;
    }

    async fetchAllLocation() {

        const items = await LocationModel
            .find()
            .sort({ createdAt: -1 }) // optional sorting
            .lean();

        return items;
    }



    async deleteLocationByDeviceId(deviceId: string) {
        const deleted = await LocationModel.findOneAndDelete({ deviceId });
        if (!deleted) {
            throw new ApiError(404, 'Location not found for the provided device ID');
        }
        return { message: 'Location deleted successfully' };
    }


}
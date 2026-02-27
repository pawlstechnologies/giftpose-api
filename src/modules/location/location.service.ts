import axios  from "axios";
import { LocationInterface } from "./location.types";
import LocationModel from "./location.mdel";
import { ApiError } from '../../utils/ApiError';

import { getDistancebetweenCoordinates } from "../../utils/distance";


export class LocationService {
     async getLocationByPostcode(
        postCode: string,
        deviceId: string,
        miles: number
    ): Promise<LocationInterface> {

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

        if (data.status !== 'OK' || !data.results.length) {
            throw new ApiError(404, 'Location not found for the provided postcode');
        }

        const result = data.results[0];
        const location = result.geometry.location;

        const cityComponent = result.address_components.find((comp: any) =>
            comp.types.includes('locality') ||
            comp.types.includes('postal_town')
        );

        const locationData = {
            deviceId,
            postCode,
            lng: location.lng,
            lat: location.lat,
            city: cityComponent?.long_name || '',
            address: result.formatted_address || '',
            miles
        };

        const savedLocation = await LocationModel.findOneAndUpdate(
            { deviceId },
            locationData,
            { new: true, upsert: true, runValidators: true }
        );

        return savedLocation.toObject();
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

    
}
import { Schema, model, Document } from "mongoose";

import { LocationInterface } from "./location.types";

const locationSchema = new Schema<LocationInterface>(
    {
        deviceId: { type: String, required: true, unique: true, trim: true },
        postCode: { type: String, required: true, trim: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        city: { type: String, required: true },
        address: { type: String },
        miles: { type: Number, required: true }
    },
    { timestamps: true }
);

const LocationModel = model<LocationInterface & Document>(
    'Location',
    locationSchema
);

export default LocationModel;
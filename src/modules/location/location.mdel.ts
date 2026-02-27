import { Schema, model, HydratedDocument } from "mongoose";
import { LocationInterface } from "./location.types";

export type LocationModel = HydratedDocument<LocationInterface>;

const locationSchema = new Schema<LocationModel>(
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

export default model<LocationModel>("Location", locationSchema);

// const LocationModel = model<LocationInterface & Document>(
//     'Location',
//     locationSchema
// );

// export default LocationModel;
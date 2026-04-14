import { Types } from "mongoose";

export interface ItemInterface {
    userId: Types.ObjectId;
    name: string;
    description?: string;
    imageUrls: string[];
    categoryId: Types.ObjectId; //string;
    subCategoryId?: Types.ObjectId; //string;
    contentId?: Types.ObjectId; //string;
    isCategorised: boolean;
    city?: string;
    lng: number;
    lat: number;
    location: {
        type: "Point";
        coordinates: [number, number]; // [lng, lat]
    };
    postCode: string;
    partner?: string;
    isTaken: boolean;
    takenByDevices: string[];
    hiddenByDevices: string[];
    visitCount: number;

    url: String;
    thumbnail: String;
    type: String;
    pickup: Boolean;
    country: String;
    postId: Number;
    expiration: Date;
    status: String;

    createdAt?: Date;
    updatedAt?: Date;

}
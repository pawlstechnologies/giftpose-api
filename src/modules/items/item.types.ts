import { Types } from "mongoose";

export interface ItemInterface {
  userId: Types.ObjectId;
  deviceId: string;
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
  interestedByDevices: {
    deviceId: string;
    userId: string; //Types.ObjectId;
    message?: string;
    createdAt?: Date;
  }[];
  reports: {
    deviceId: string;
    reason: "NOT_AVAILABLE" | "WRONG_LOCATION" | "MISLEADING" | "PROHIBITED" | "NOT_FREE" | "SCAM" | "INAPPROPRIATE" | "SPAM" | "SAFETY" | "OTHER";
  }[];
  visitCount: number;

  url: String;
  thumbnail: String;
  type: String;
  pickup: String;
  country: String;
  postId: Number;
  expiration: Date;
  status: String;

  createdAt?: Date;
  updatedAt?: Date;

}
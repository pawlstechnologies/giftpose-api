import { Document, Types } from "mongoose";

export type StatusType = "Active" | "Inactive";

export interface IDeviceAlert extends Document {
  deviceId: string;           // link to LocationModel.deviceId
  categories: Types.ObjectId[]; 
  keywords: string[];
  status: StatusType;
  created_at: Date;
  updated_at: Date;
}


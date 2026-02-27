import { Schema, model } from "mongoose";
import { IDeviceAlert, StatusType } from "./alerts.types";

const DeviceAlertSchema = new Schema<IDeviceAlert>(
  {
    deviceId: { type: String, required: true, index: true }, // link to device
    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    keywords: [{ type: String }],
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const DeviceAlertModel = model<IDeviceAlert>("DeviceAlert", DeviceAlertSchema);

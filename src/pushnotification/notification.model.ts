// import { Schema, model } from "mongoose";

// export interface INotification {
//   deviceId: string;
//   itemId: string;
//   title: string;
//   body: string;
//   imageUrl?: string;
//   read: boolean;
//   createdAt?: Date;
// }

// const NotificationSchema = new Schema<INotification>(
//   {
//     deviceId: { type: String, required: true, index: true },
//     itemId: { type: String, required: true, ref: "Item" },
//     title: { type: String, required: true },
//     body: { type: String, required: true },
//     imageUrl: { type: String },
//     read: { type: Boolean, default: false },
//   },
//   { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
// );

// export const NotificationModel = model<INotification>(
//   "Notification",
//   NotificationSchema
// );


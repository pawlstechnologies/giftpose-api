// modules/activity-log/activity-log.model.ts

import { Schema, model } from "mongoose";
import { ActivityLog } from "./activity.types";

const activityLogSchema =
    new Schema<ActivityLog>(
        {
            adminId: {
                type: String,
                required: true,
                index: true,
            },

            adminEmail: String,

            action: {
                type: String,
                required: true,
                index: true,
            },

            resource: {
                type: String,
                required: true,
                index: true,
            },

            resourceId: String,

            description: {
                type: String,
                required: true,
            },

            oldData: {
                type: Schema.Types.Mixed,
            },

            newData: {
                type: Schema.Types.Mixed,
            },

            ipAddress: String,
            userAgent: String,
            browser: String,
            os: String,
            deviceType: String,
            deviceId: String,
        
        },
        {
            timestamps: true,
        }
    );

export const ActivityLogModel =
    model<ActivityLog>(
        "ActivityLog",
        activityLogSchema
    );

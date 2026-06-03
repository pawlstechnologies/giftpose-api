// modules/activity-log/activity-log.types.ts

import { HydratedDocument } from "mongoose";

export interface ActivityLog {
    adminId: string;
    adminEmail?: string;

    action: string;

    resource: string;

    resourceId?: string;

    description: string;

    oldData?: Record<string, any>;

    newData?: Record<string, any>;

    ipAddress?: string;

    userAgent?: string;
     browser?: string;
    os?: string;
    deviceType?: string;

    deviceId?: string;
}

export type HydratedActivityLog =
    HydratedDocument<ActivityLog>;


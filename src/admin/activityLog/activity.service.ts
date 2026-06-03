// modules/activity-log/activity-log.service.ts

import { ActivityLogModel } from "./activity.model";

interface LogActivityPayload {
    adminId: string;
    adminEmail?: string;

    action: string;

    resource: string;

    resourceId?: string;

    description: string;

    oldData?: any;

    newData?: any;

    ipAddress?: string;

    userAgent?: string;
    browser?: string;
    os?: string;
    deviceType?: string;

    deviceId?: string;
}

export const logActivity =
    async (
        payload: LogActivityPayload
    ) => {
        try {
            await ActivityLogModel.create({
                ...payload,
            });
        } catch (error) {
            console.error(
                "Activity Log Error:",
                error
            );
        }
    };

    export const getGlobalActivity = async (filter: any, options: any) => {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const logs = await ActivityLogModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ActivityLogModel.countDocuments(filter);

        return {
            logs,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    };

    export const getActivity = async (adminId: string, options: any) => {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const logs = await ActivityLogModel.find({ adminId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ActivityLogModel.countDocuments({ adminId });


        return {
            logs,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    };
import { Request, Response } from 'express';
import { getActivity, getGlobalActivity, logActivity } from './activity.service';

import { AuthRequest } from '../auth/admin.middleware';

export const globalActivityList = async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    // const adminId = req.adminId;

    try {
        const logs = await getGlobalActivity({}, { page: Number(page) || 1, limit: Number(limit) || 20 });
        res.json(logs);
    } catch (error) {
        console.error("Error fetching global activity logs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
        
};

export const activityList = async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query;
    const adminId = req.user.id; // from auth middleware

    try {
        const logs = await getActivity(adminId, { page: Number(page) || 1, limit: Number(limit) || 20 });
        res.json(logs);
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
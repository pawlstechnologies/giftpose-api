import { Request, Response, NextFunction } from 'express';

import ItemsService from './item.service';


const itemService = new ItemsService();

export const createItem = async (req: Request, res: Response) => {
    try {
        const item = await itemService.createItem(req.body);
        res.status(201).json({
            status: true,
            message: 'Item created successfully',
            data: item,
        });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}



export const getItemsNearMe = async (req: Request, res: Response) => {
    try {
        // const { deviceId } = req.params;

        const rawDeviceId = req.params.deviceId;

        // if (!deviceId) {
        //     return res.status(400).json({ message: 'deviceId is required' });
        // }

        if (!rawDeviceId || Array.isArray(rawDeviceId)) {
            return res.status(400).json({ message: 'deviceId is required' });
        }

        const deviceId = rawDeviceId;

        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = 5;
        const offset = (page - 1) * limit;

        const { items, total, userLocation } = await itemService.getItemsNearLocation(deviceId, limit, offset);

        res.json({
            success: true,
            message: 'Items near me retrieved successfully',
            count: items.length,
            userLocation,
            data: items,
            page,
            perPage: limit,
            total,
            totalPages: Math.ceil(total / limit),
        });

        // res.json(items);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}

interface GetItemParams {
    deviceId: string;
    itemId: string;
}

export const getItemById = async (req: Request<GetItemParams>, res: Response) => {
    try {
        const { deviceId, itemId } = req.params;

        if (!itemId) {
            return res.status(400).json({ message: "Item id is required" });
        }

        if (!deviceId) {
            return res.status(400).json({ message: "Device id is required" });
        }

        const item = await itemService.getItemById(deviceId, itemId);

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json({
            success: true,
            message: 'Item retrieved successfully',
            data: item
        });

    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            message: error.message || "Internal Server Error"
        });
    }
};



export const listTrashNotingItems = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const trashnothingitems = await itemService.getTrashNotingItems();

        res.status(200).json({
            success: true,
            count: trashnothingitems.length,
            data: trashnothingitems
        });

    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Failed to fetch TrashNothing items'
        });
    }
}
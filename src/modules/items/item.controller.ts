import { Request, Response, NextFunction } from 'express';

import ItemsService from './item.service';
import { AuthRequest } from '../../middleware/auth.middleware';


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

export const analyseImage = async (req: AuthRequest, res: Response) => {

    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({
                message: 'Images are required'
            });
        }

        const result = await itemService.analyseImage(files);

        return res.status(200).json({
            message: 'AI analysis complete',
            data: result
        });

    } catch (err: any) {
        return res.status(400).json({
            message: err.message
        });
    }

}

export const postItem = async (req: AuthRequest, res: Response) => {
    try {

        const user = req.user;

        if (!user) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }


        const item = await itemService.postItem(req.body, req.file, user);

        return res.status(201).json({
            status: true,
            message: 'Item Posted Successfully',
            data: item
        });

    } catch (err: any) {
        return res.status(400).json({
            message: err.message
        });
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

        const page = Math.max(Number(req.query.page) || 1);
        const limit = 10;
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

interface GetDeviceParams {
    deviceId: string;
}

export const searchItemsNearMe = async (req: Request<GetDeviceParams>, res: Response) => {
    try {
        const { deviceId } = req.params;
        const { keywords, page = 1, limit = 10 } = req.body;

        if (!deviceId) return res.status(400).json({ success: false, message: "DeviceId is required" });

        const offset = (page - 1) * limit;

        const items = await itemService.searchItemsNearMe(deviceId, keywords, Number(limit), offset);

        return res.json({
            success: true,
            message: "Items near you fetched successfully",
            page: Number(page),
            perPage: Number(limit),
            data: items
        });

    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// export const searchItemsNearMe = async (req: Request<GetDeviceParams>, res: Response) => {
//   try {
//     const { deviceId } = req.params;
//     const { keywords, page = 1, limit = 10 } = req.body; // POST body

//     if (!deviceId) return res.status(400).json({ success: false, message: "DeviceId is required" });

//     const offset = (page - 1) * limit;

//     const result = await itemService.searchItemsNearMe(deviceId, keywords, Number(limit), offset);

//     return res.json({
//       success: true,
//       message: "Items near you fetched successfully",
//       page: Number(page),
//       perPage: Number(limit),
//       total: result.total,
//       userLocation: result.userLocation,
//       data: result.items
//     });

//   } catch (error: any) {
//     return res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message || "Internal server error"
//     });
//   }
// };




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

export const markItemAsTaken = async (req: any, res: any) => {
    const { itemId } = req.params;
    const { deviceId } = req.body;

    if (!deviceId) {
        return res.status(400).json({
            status: false,
            message: "Device ID is required"
        });
    }

    const result = await itemService.markItemAsTaken(itemId, deviceId);

    return res.status(result.statusCode).json({
        status: result.status,
        message: result.message
    });
};

export const hideItem = async (req: any, res: any) => {
    try {
        const { itemId } = req.params;
        const { deviceId } = req.body;

        // 🔍 Validate input
        if (!itemId) {
            return res.status(400).json({
                status: false,
                message: "Item ID is required"
            });
        }

        if (!deviceId) {
            return res.status(400).json({
                status: false,
                message: "Device ID is required"
            });
        }

        const result = await itemService.hideItem(itemId, deviceId);

        // 🔍 Handle unexpected service response
        if (!result || typeof result.statusCode !== "number") {
            return res.status(500).json({
                status: false,
                message: "Unexpected error: invalid service response"
            });
        }

        return res.status(result.statusCode).json({
            status: result.status,
            message: result.message
        });

    } catch (error: any) {
        console.error("HIDE ITEM ERROR:", error);

        const statusCode = error?.statusCode || 500;
        const message =
            error?.message ||
            (typeof error === "string" ? error : JSON.stringify(error)) ||
            "Unknown error occurred";

        return res.status(statusCode).send(message);
        // console.error("HIDE ITEM ERROR:", error);

        // return res.status(500).json({
        //     status: false,
        //     message: error?.message || "Failed to hide item. Please try again."
        // });
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


export const listAllItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const items = await itemService.fetchAllItems();

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });

    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to fetch items'
        });
    }
};

import { Request, Response } from "express";
import alertService from "./alerts.service";
import { createAlertSchema, updateAlertSchema, paginationSchema, notificationKeywordSchema } from "./alerts.validation";


export const createAlert = async (req: Request, res: Response) => {
    const { error } = createAlertSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });

    const alert = await alertService.createAlert(req.body.deviceId, req.body);
    res.status(201).json({ success: true, data: alert });
};

export const listAlerts = async (req: Request, res: Response) => {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) return res.status(400).json({ success: false, message: error.message });

    const deviceId = req.query.deviceId as string;
    if (!deviceId) return res.status(400).json({ success: false, message: "deviceId is required" });

    const result = await alertService.listAlerts(deviceId, value.page, value.limit);
    res.json({ success: true, ...result });
};

interface AlertParams {
  id: string;
}


export const updateAlert = async (req: Request<AlertParams>, res: Response) => {
    const { error } = updateAlertSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });

    const deviceId = req.body.deviceId as string;
    if (!deviceId) return res.status(400).json({ success: false, message: "deviceId is required" });

    const alert = await alertService.updateAlert(req.params.id, deviceId, req.body);
    res.json({ success: true, data: alert });
};

export const deleteAlert = async (req: Request<AlertParams>, res: Response) => {
    const deviceId = req.query.deviceId as string;
    if (!deviceId) return res.status(400).json({ success: false, message: "deviceId is required" });

    await alertService.deleteAlert(req.params.id, deviceId);
    res.json({ success: true, message: "Alert deleted" });
};

export const getCategoriesByKeywords = async (req: Request, res: Response) => {
    try {
        const { error, value } = notificationKeywordSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        const categories = await alertService.getCategoriesByKeywords(
            value.keywords
        );

        res.json({
            success: true,
            keywords: value.keywords,
            categoriesCount: categories.categories.length,
            subcategoriesCount: categories.subcategories.length,
            data: categories
        });

    } catch (err: any) {
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        });
    }
};



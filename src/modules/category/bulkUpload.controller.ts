import { Request, Response } from "express";
import { bulkUploadCSVService } from "./bulkUpload.service";



export const bulkUploadCSVController = async (
    req: Request,
    res: Response
) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "CSV file is required",
            });
        }

        const result = await bulkUploadCSVService(req.file.path);

        return res.status(200).json({
            success: true,
            message: "CSV uploaded successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};




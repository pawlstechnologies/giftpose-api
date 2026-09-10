import { Request, Response } from "express";
import { AdminUserService } from "./user.services";

export class AdminUserController {
  static async listUsers(req: Request, res: Response) {
    try {
      const { page, limit, search, plan } = req.query;
      const data = await AdminUserService.getAccountHolders({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search ? String(search) : undefined,
        plan: plan ? String(plan) : undefined,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      console.error("Failed to list users for admin:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to retrieve account holders",
      });
    }
  }

  static async getUserDetail(req: Request, res: Response) {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const data = await AdminUserService.getUserDetails(userId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      console.error("Failed to fetch user details for admin:", err);
      const statusCode = err.message === "User not found" ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Failed to retrieve user details",
      });
    }
  }
}

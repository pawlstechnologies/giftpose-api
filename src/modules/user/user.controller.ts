
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";



export const getMe = async (req: AuthRequest, res: Response) => {

    try {
      return res.status(200).json({
        status: true,
        message: "User Information",
        user: req.user
      });
    } catch (err: any) {
      return res.status(500).json({
        message: err.message
      });
    }



}


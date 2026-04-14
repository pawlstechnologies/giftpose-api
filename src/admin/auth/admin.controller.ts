import { Request, Response } from 'express';
import { AdminAuthService } from './admin.service';
import { Auth } from 'firebase-admin/lib/auth/auth';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AdminController {
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const result = await AdminAuthService.login(email, password);
            res.json(result);
        } catch (err: any) {
            res.status(401).json({ error: err.message });
        }
    }

    static async verifyOTP(req: Request, res: Response) {
        try {
            const { adminId, otp } = req.body;

            if (!adminId || !otp) {
                return res.status(400).json({ message: 'Admin ID and OTP are required' });
            }

            // Call service to verify OTP
            const result = await AdminAuthService.verifyOTP(adminId, otp);

            // Send response
            res.status(200).json(result);

        } catch (err: any) {
            // Catch any errors from service
            res.status(400).json({
                message: err.message || 'OTP verification failed'
            });
        }
    }

    static async getMe(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user.id; // from auth middleware
            const result = await AdminAuthService.getMe(adminId);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }   
    }

    static async dashboard(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user.id; // from auth middleware
            const result = await AdminAuthService.getDashboardData(adminId);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }   
    }   

    static async logout(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user.id; // from auth middleware
            const refreshToken = req.body.refreshToken;

            const result = await AdminAuthService.logout(adminId, refreshToken);

            res.status(200).json(result);

        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };


    // static async verifyMFA(req: Request, res: Response) {
    //     try {
    //         const { adminId, code } = req.body;
    //         const result = await AdminAuthService.verifyMFA(adminId, code);
    //         res.json(result);
    //     } catch (err: any) {
    //         res.status(401).json({ error: err.message });
    //     }
    // }
}

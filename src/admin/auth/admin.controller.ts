import { Request, Response } from 'express';
import { AdminAuthService } from './admin.service';

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

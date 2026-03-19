import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { setAuthCookies } from '../../utils/cookies';
import { AuthRequest } from '../../middleware/auth.middleware';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
    try {
        const result = await authService.register(req.body);
        // const { accessToken, refreshToken, user } =
        //     await authService.login(req.body);
        // setAuthCookies(res, accessToken, refreshToken);

        res.status(201).json({
            status: true,
            message: 'User Created Successfully. Kindly verify email address',
            data: result,
        });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        // const result = await authService.login(req.body);
        const { accessToken, user } = await authService.login(req.body);
        res.status(201).json({
            status: true,
            message: 'User Logged In Successfully',
            token: accessToken,
            data: user,
        });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const result = await authService.verifyEmail(req.body);
        res.status(201).json({
            status: true,
            message: 'User Verification Successful',
            data: result,
        });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}


export const resendEmailVerificatioin = async (req: Request, res: Response) => {

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email is required'
            });
        }

        const result = await authService.resendVerification(email);
        res.status(200).json({
            status: true,
            // message: 'User Verification Resent Successfully',
            data: result,
        });

    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export const forgotPassword = async (req: Request, res: Response) => {

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email is required'
            });
        }

       const result =  await authService.forgotPassword(email);

       return res.status(200).json(result);
        // return res.status(200).json({
        //     message: 'If this email exists, a reset link/token has been sent'
        // });

    } catch (err: any) {
        return res.status(400).json({
            message: err.message
        });
    }

}

export const resetPassword = async (req: Request, res: Response) => {

    try {

        const { email, code, newPassword, confirmPassword } = req.body;

        // if (!token || !newPassword || !confirmPassword) {
        //     return res.status(400).json({
        //         message: 'All fields are required'
        //     });
        // }

        if (!email || !code || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: 'Passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters'
            });
        }

        const result = await authService.resetPassword(email,
      code,
      newPassword);

        return res.status(200).json(result);

    } catch (err: any) {
        return res.status(400).json({
            message: err.message
        });
    }
}

export const logout = async (req: AuthRequest, res: Response) => {


    try {
        const userId = req.user._id;

        await authService.logout(userId);

        // Optional: if you were using cookies, clear them
        // res.clearCookie('accessToken');
        // res.clearCookie('refreshToken');

        return res.status(200).json({
            message: 'Logged out successfully'
        });

    } catch (err: any) {
        return res.status(400).json({
            message: err.message
        });
    }

}








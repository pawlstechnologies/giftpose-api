import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../modules/onboarding/auth.model';

export interface AuthRequest extends Request {
    user?: any;
}

export const protect = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    //   try {
    //     const token = req.cookies?.accessToken;

    //     if (!token) {
    //       return res.status(401).json({ message: 'User Not Authenticated' });
    //     }

    //     const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
    //       id: string;
    //     };

    //     const user = await UserModel.findById(decoded.id).select('-password');

    //     if (!user) {
    //       return res.status(401).json({ message: 'User not found' });
    //     }

    //     req.user = user;

    //     next();
    //   } catch (err) {
    //     return res.status(401).json({ message: 'Invalid or expired token' });
    //   }

    try {
        // 1️⃣ Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // 2️⃣ Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

        // 3️⃣ Fetch user
        const user = await UserModel.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();

    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

};


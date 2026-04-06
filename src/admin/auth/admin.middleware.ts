import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


const WHITELISTED_IPS = [
    '127.0.0.1',
    '::1',
    '192.168.1.10', // office IP
    'your-production-ip'
];

export const ipWhitelistMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const ip =
        req.headers['x-forwarded-for']?.toString().split(',')[0] ||
        req.socket.remoteAddress;

    if (!ip || !WHITELISTED_IPS.includes(ip)) {
        return res.status(403).json({
            message: 'Access denied from this IP'
        });
    }

    next();
};


export const adminAuthMiddleware = (roles: string[] = []) => {
    return (req: any, res: any, next: any) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const decoded: any = jwt.verify(
                token,
                process.env.ADMIN_JWT_SECRET!
            );

            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            req.admin = decoded;
            next();
        } catch {
            return res.status(401).json({ message: 'Invalid token' });
        }
    };
};



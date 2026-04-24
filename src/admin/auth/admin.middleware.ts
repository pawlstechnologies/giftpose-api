import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


const WHITELISTED_IPS = [
    '127.0.0.1',
    '::1',
    '192.168.1.10', // office IP
    'your-production-ip'
];

export interface AuthRequest extends Request {
    user?: any;
}


export const ipWhitelistMiddleware = (
    req: AuthRequest,
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

export const adminAuthMiddleware =
    (roles: string[] = []) =>
    (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return res.status(401).json({ message: 'No token provided' });
            }

            const token = authHeader.split(' ')[1];

            const decoded: any = jwt.verify(
                token,
                process.env.ADMIN_JWT_SECRET!
            );

            // ✅ THIS IS WHAT YOU ARE MISSING
            req.user = decoded;

            // ✅ ROLE CHECK
            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            next();
        } catch (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    };


// export const adminAuthMiddleware = (roles: string[] = []) => {
//     return (req: any, res: any, next: any) => {
//         const token = req.headers.authorization?.split(' ')[1];

//         if (!token) {
//             return res.status(401).json({ message: 'Unauthorized' });
//         }

//         try {
//             const decoded: any = jwt.verify(
//                 token,
//                 process.env.ADMIN_JWT_SECRET!
//             );

//             if (roles.length && !roles.includes(decoded.role)) {
//                 return res.status(403).json({ message: 'Forbidden' });
//             }

//             req.admin = decoded;
//             next();
//         } catch {
//             return res.status(401).json({ message: 'Invalid token' });
//         }
//     };
// };



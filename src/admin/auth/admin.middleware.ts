import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


const DEFAULT_WHITELISTED_IPS = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    '192.168.1.10',
];

export interface AuthRequest extends Request {
    user?: any;
}

export const ipWhitelistMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    // If IP whitelisting is explicitly disabled or not configured in production, allow pass-through
    const configuredIps = process.env.ADMIN_IP_WHITELIST
        ? process.env.ADMIN_IP_WHITELIST.split(',').map((ip) => ip.trim()).filter(Boolean)
        : null;

    if (process.env.NODE_ENV !== 'production' && !configuredIps) {
        return next();
    }

    const allowedIps = configuredIps && configuredIps.length > 0 ? configuredIps : DEFAULT_WHITELISTED_IPS;

    const rawIp =
        req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
        req.socket.remoteAddress ||
        '';

    const normalizedIp = rawIp.replace(/^::ffff:/, '');

    const isAllowed = allowedIps.some((allowed) => {
        const cleanAllowed = allowed.replace(/^::ffff:/, '');
        return cleanAllowed === normalizedIp || cleanAllowed === rawIp;
    });

    if (!isAllowed) {
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



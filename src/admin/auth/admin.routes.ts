import { Router } from 'express';
import { AdminController } from './admin.controller';
import {
    ipWhitelistMiddleware,
    adminAuthMiddleware
} from './admin.middleware';


const router = Router();
router.use(ipWhitelistMiddleware);


// 🔐 AUTH ROUTES
router.post('/login', AdminController.login);
router.post('/verify-otp', AdminController.verifyOTP);

// 🔐 PROTECTED ROUTE EXAMPLE
router.get(
    '/dashboard',
    adminAuthMiddleware(['super_admin', 'moderator']),
    (req, res) => {
        res.json({ message: 'Welcome Admin' });
    }
);

export default router;



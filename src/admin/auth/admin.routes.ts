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
router.post('/logout', adminAuthMiddleware(), AdminController.logout);

// 🔐 PROTECTED ROUTE EXAMPLE
router.get('/me', adminAuthMiddleware(), AdminController.getMe);

router.get(
    '/dashboard',
    adminAuthMiddleware(['super_admin', 'moderator']),
    AdminController.dashboard
);


export default router;



import { Router } from 'express';

import { register, login, verifyEmail, resendEmailVerificatioin, forgotPassword, resetPassword } from './auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendEmailVerificatioin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;


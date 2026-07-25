import { Router } from 'express';

import { register, login, verifyEmail, resendEmailVerificatioin, forgotPassword, resetPassword, deleteUser, allUser, logout } from './auth.controller';

const router = Router();


router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendEmailVerificatioin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/all-users', allUser);
router.delete('/delete-user', deleteUser);
router.post('/logout', logout);

export default router;


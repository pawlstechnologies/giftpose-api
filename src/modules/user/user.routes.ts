import { Router } from 'express';

import { protect } from '../../middleware/auth.middleware';

import { getMe } from './user.controller';

const router = Router();


router.get('/me', protect, getMe);


export default router;


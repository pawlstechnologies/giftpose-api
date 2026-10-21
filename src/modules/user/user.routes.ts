import { Router } from 'express';

import { protect } from '../../middleware/auth.middleware';

import { getMe } from './user.controller';
import {
    getProfile,
    updateProfile,
    getMyGifts,
    getMyRequests,
    getUserReviews,
    createUserReview,
} from './profile.controller';

const router = Router();

router.get('/me', protect, getMe);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.get('/my-gifts', protect, getMyGifts);
router.get('/my-requests', protect, getMyRequests);
router.get('/reviews', protect, getUserReviews);
router.post('/reviews/:targetUserId', protect, createUserReview);

export default router;

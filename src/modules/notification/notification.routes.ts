import { Router } from 'express';

import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from './notification.controller';

const router = Router();

router.get('/:deviceId', getNotifications);
router.patch('/:notificationId/read', markNotificationAsRead);
router.patch('/:deviceId/read-all', markAllNotificationsAsRead);

export default router;


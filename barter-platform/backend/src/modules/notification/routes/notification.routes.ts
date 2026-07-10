import { Router } from 'express';
import { authenticate } from '@shared/middlewares/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  markOneAsRead,
  markAllRead,
} from '../controllers/notification.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications?page=1&limit=20&unread=true
router.get('/', getNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/read-all
router.patch('/read-all', markAllRead);

// PATCH /api/notifications/:notificationId/read
router.patch('/:notificationId/read', markOneAsRead);

export default router;

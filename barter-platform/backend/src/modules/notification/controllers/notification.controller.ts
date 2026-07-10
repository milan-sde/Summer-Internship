import { Request, Response } from 'express';
import { asyncHandler } from '@shared/middlewares/async-handler';
import { NotificationService } from '../services/notification.service';

const notificationService = new NotificationService();

// Get paginated notifications for the authenticated user
export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const unreadOnly = req.query['unread'] === 'true';

    const result = await notificationService.getUserNotifications(
      userId,
      page,
      limit,
      unreadOnly,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

// Get unread notification count for the authenticated user
export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  },
);

// Mark a single notification as read (ownership enforced in service)
export const markOneAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const notificationId = req.params['notificationId'] as string;

    const notification = await notificationService.markAsRead(
      notificationId,
      userId,
    );

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: { notification },
    });
  },
);

// Mark all unread notifications as read for the authenticated user
export const markAllRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const updatedCount = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: `${updatedCount} notification(s) marked as read.`,
      data: { updatedCount },
    });
  },
);

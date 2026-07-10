import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/notification.model';

export interface CreateNotificationInput {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: 'campaign' | 'submission';
  entityId: string;
  actionUrl: string;
  metadata?: {
    campaignTitle?: string;
    campaignId?: string;
    submissionId?: string;
  };
}

export class NotificationRepository {
  // Persist a new notification document
  async create(data: CreateNotificationInput): Promise<INotification> {
    const notification = new Notification({
      recipientId: new mongoose.Types.ObjectId(data.recipientId),
      actorId: data.actorId ? new mongoose.Types.ObjectId(data.actorId) : undefined,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType,
      entityId: new mongoose.Types.ObjectId(data.entityId),
      actionUrl: data.actionUrl,
      isRead: false,
      metadata: data.metadata || {},
    });
    return await notification.save();
  }

  // Fetch paginated notifications for a user, newest first
  async findByRecipient(
    recipientId: string,
    options: {
      page: number;
      limit: number;
      unreadOnly?: boolean;
    },
  ): Promise<{ notifications: INotification[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return { notifications: [], total: 0 };
    }

    const filter: any = {
      recipientId: new mongoose.Types.ObjectId(recipientId),
    };

    if (options.unreadOnly) {
      filter.isRead = false;
    }

    const skip = (options.page - 1) * options.limit;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit),
      Notification.countDocuments(filter),
    ]);

    return { notifications, total };
  }

  // Return the count of unread notifications for a user
  async countUnread(recipientId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(recipientId)) return 0;
    return await Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(recipientId),
      isRead: false,
    });
  }

  // Mark a single notification as read, enforcing ownership
  async markOneAsRead(
    notificationId: string,
    recipientId: string,
  ): Promise<INotification | null> {
    if (
      !mongoose.Types.ObjectId.isValid(notificationId) ||
      !mongoose.Types.ObjectId.isValid(recipientId)
    ) {
      return null;
    }

    return await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        recipientId: new mongoose.Types.ObjectId(recipientId),
      },
      {
        $set: { isRead: true, readAt: new Date() },
      },
      { new: true },
    );
  }

  // Mark all unread notifications as read for a user
  async markAllAsRead(recipientId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(recipientId)) return 0;

    const result = await Notification.updateMany(
      {
        recipientId: new mongoose.Types.ObjectId(recipientId),
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: new Date() },
      },
    );

    return result.modifiedCount;
  }

  // Find a notification by ID (for ownership validation)
  async findById(id: string): Promise<INotification | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Notification.findById(id);
  }
}

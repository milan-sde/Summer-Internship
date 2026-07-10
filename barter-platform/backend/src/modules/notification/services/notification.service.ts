import {
  NotificationRepository,
  CreateNotificationInput,
} from '../repositories/notification.repository';
import { NotificationType, INotification } from '../models/notification.model';
import { NotFoundError } from '@shared/errors/app-error';

export interface NotificationListResult {
  notifications: INotification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  unreadCount: number;
}

export class NotificationService {
  private repository: NotificationRepository;

  constructor() {
    this.repository = new NotificationRepository();
  }

  /**
   * Create a notification after a business event completes successfully.
   * This method is designed to be called fire-and-forget from business services.
   * A failure here must not roll back the successful business operation.
   * Log the error instead.
   */
  async createNotification(input: CreateNotificationInput): Promise<void> {
    try {
      await this.repository.create(input);
    } catch (err) {
      // Non-critical: log and continue — do not propagate notification errors
      console.error('[NotificationService] Failed to create notification:', err);
    }
  }

  // Get paginated notifications for the authenticated user
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<NotificationListResult> {
    const cappedLimit = Math.min(limit, 50); // Max 50 per page

    const { notifications, total } = await this.repository.findByRecipient(
      userId,
      { page, limit: cappedLimit, unreadOnly },
    );

    const unreadCount = await this.repository.countUnread(userId);

    return {
      notifications,
      total,
      page,
      limit: cappedLimit,
      pages: Math.ceil(total / cappedLimit),
      unreadCount,
    };
  }

  // Get the number of unread notifications for a user
  async getUnreadCount(userId: string): Promise<number> {
    return await this.repository.countUnread(userId);
  }

  // Mark a specific notification as read, ensuring the user owns it
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<INotification> {
    const notification = await this.repository.markOneAsRead(
      notificationId,
      userId,
    );

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    return notification;
  }

  // Mark all of the user's unread notifications as read
  async markAllAsRead(userId: string): Promise<number> {
    return await this.repository.markAllAsRead(userId);
  }

  // ─── Factory Helpers ────────────────────────────────────────────────────────
  // These helpers build the correct notification payload for each business event.
  // Business services call these after their core operation succeeds.

  // Brand receives: influencer applied to their campaign
  async notifyApplicationReceived(opts: {
    brandUserId: string;
    influencerUserId: string;
    campaignId: string;
    campaignTitle: string;
    influencerName: string;
  }): Promise<void> {
    await this.createNotification({
      recipientId: opts.brandUserId,
      actorId: opts.influencerUserId,
      type: NotificationType.APPLICATION_RECEIVED,
      title: 'New Campaign Application',
      message: `${opts.influencerName} applied to your campaign "${opts.campaignTitle}".`,
      entityType: 'campaign',
      entityId: opts.campaignId,
      actionUrl: '/campaigns',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
      },
    });
  }

  // Influencer receives: brand accepted their application
  async notifyApplicationAccepted(opts: {
    influencerUserId: string;
    brandUserId: string;
    campaignId: string;
    campaignTitle: string;
  }): Promise<void> {
    await this.createNotification({
      recipientId: opts.influencerUserId,
      actorId: opts.brandUserId,
      type: NotificationType.APPLICATION_ACCEPTED,
      title: 'Application Accepted 🎉',
      message: `You have been accepted into the campaign "${opts.campaignTitle}". You can now start creating deliverables.`,
      entityType: 'campaign',
      entityId: opts.campaignId,
      actionUrl: '/campaigns',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
      },
    });
  }

  // Influencer receives: brand rejected their application
  async notifyApplicationRejected(opts: {
    influencerUserId: string;
    brandUserId: string;
    campaignId: string;
    campaignTitle: string;
  }): Promise<void> {
    await this.createNotification({
      recipientId: opts.influencerUserId,
      actorId: opts.brandUserId,
      type: NotificationType.APPLICATION_REJECTED,
      title: 'Application Not Selected',
      message: `Your application to "${opts.campaignTitle}" was not selected this time.`,
      entityType: 'campaign',
      entityId: opts.campaignId,
      actionUrl: '/campaigns',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
      },
    });
  }

  // Brand receives: influencer submitted a deliverable for review
  async notifyDeliverableSubmitted(opts: {
    brandUserId: string;
    influencerUserId: string;
    campaignId: string;
    campaignTitle: string;
    submissionId: string;
    influencerName: string;
  }): Promise<void> {
    await this.createNotification({
      recipientId: opts.brandUserId,
      actorId: opts.influencerUserId,
      type: NotificationType.DELIVERABLE_SUBMITTED,
      title: 'Content Submitted for Review',
      message: `${opts.influencerName} submitted a deliverable for "${opts.campaignTitle}" for your review.`,
      entityType: 'submission',
      entityId: opts.submissionId,
      actionUrl: '/campaigns',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
        submissionId: opts.submissionId,
      },
    });
  }

  // Influencer receives: brand approved their deliverable
  async notifyDeliverableApproved(opts: {
    influencerUserId: string;
    brandUserId: string;
    campaignId: string;
    campaignTitle: string;
    submissionId: string;
  }): Promise<void> {
    await this.createNotification({
      recipientId: opts.influencerUserId,
      actorId: opts.brandUserId,
      type: NotificationType.DELIVERABLE_APPROVED,
      title: 'Deliverable Approved ✅',
      message: `Your deliverable for "${opts.campaignTitle}" has been approved. You can now publish it to Instagram.`,
      entityType: 'submission',
      entityId: opts.submissionId,
      actionUrl: '/content-workspace',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
        submissionId: opts.submissionId,
      },
    });
  }

  // Influencer receives: brand requested changes on their deliverable
  async notifyDeliverableChangesRequested(opts: {
    influencerUserId: string;
    brandUserId: string;
    campaignId: string;
    campaignTitle: string;
    submissionId: string;
    feedback: string;
  }): Promise<void> {
    // Truncate feedback to keep metadata compact
    const shortFeedback =
      opts.feedback.length > 120
        ? opts.feedback.slice(0, 117) + '...'
        : opts.feedback;

    await this.createNotification({
      recipientId: opts.influencerUserId,
      actorId: opts.brandUserId,
      type: NotificationType.DELIVERABLE_CHANGES_REQUESTED,
      title: 'Changes Requested',
      message: `Changes were requested for your deliverable on "${opts.campaignTitle}": "${shortFeedback}"`,
      entityType: 'submission',
      entityId: opts.submissionId,
      actionUrl: '/content-workspace',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
        submissionId: opts.submissionId,
      },
    });
  }

  // Influencer receives: their content was successfully published to Instagram
  async notifyContentPublished(opts: {
    influencerUserId: string;
    campaignId: string;
    campaignTitle: string;
    submissionId: string;
  }): Promise<void> {
    await this.createNotification({
      recipientId: opts.influencerUserId,
      type: NotificationType.CONTENT_PUBLISHED,
      title: 'Content Published to Instagram 🚀',
      message: `Your deliverable for "${opts.campaignTitle}" has been successfully published to Instagram.`,
      entityType: 'submission',
      entityId: opts.submissionId,
      actionUrl: '/content-workspace',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
        submissionId: opts.submissionId,
      },
    });
  }

  // Influencer receives: Instagram publishing failed
  async notifyContentPublishFailed(opts: {
    influencerUserId: string;
    campaignId: string;
    campaignTitle: string;
    submissionId: string;
  }): Promise<void> {
    await this.createNotification({
      recipientId: opts.influencerUserId,
      type: NotificationType.CONTENT_PUBLISH_FAILED,
      title: 'Publishing Failed',
      message: `Failed to publish your deliverable for "${opts.campaignTitle}" to Instagram. Please reconnect your Instagram account and try again.`,
      entityType: 'submission',
      entityId: opts.submissionId,
      actionUrl: '/content-workspace',
      metadata: {
        campaignTitle: opts.campaignTitle,
        campaignId: opts.campaignId,
        submissionId: opts.submissionId,
      },
    });
  }
}

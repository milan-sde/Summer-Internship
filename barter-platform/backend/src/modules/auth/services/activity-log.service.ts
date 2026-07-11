import { ActivityLogRepository } from "../repositories/activity-log.repository";

export class ActivityLogService {
  private activityLogRepository: ActivityLogRepository;

  constructor() {
    this.activityLogRepository = new ActivityLogRepository();
  }

  async log(params: {
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    changes?: Record<string, any> | null;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.activityLogRepository.create({
      actorId: params.actorId as any,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId as any,
      changes: params.changes || null,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  }
}

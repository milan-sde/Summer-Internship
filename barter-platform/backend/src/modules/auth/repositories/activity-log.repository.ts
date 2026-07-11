import { ActivityLog, IActivityLog } from "../models/activity-log.model";

export class ActivityLogRepository {
  async create(data: Partial<IActivityLog>): Promise<IActivityLog> {
    const log = new ActivityLog(data);
    return log.save();
  }

  async findByActor(
    actorId: string,
    limit = 50,
    skip = 0,
  ): Promise<IActivityLog[]> {
    return ActivityLog.find({ actorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async findByEntity(
    entity: string,
    entityId: string,
    limit = 50,
  ): Promise<IActivityLog[]> {
    return ActivityLog.find({ entity, entityId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

import { ContentSubmission, IContentSubmission } from "../models/content-submission.model";
import mongoose from "mongoose";

export class ContentSubmissionRepository {
  async create(data: Partial<IContentSubmission>): Promise<IContentSubmission> {
    const submission = new ContentSubmission(data);
    return await submission.save();
  }

  async findById(id: string): Promise<IContentSubmission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await ContentSubmission.findById(id);
  }

  async findOne(filter: Record<string, any>): Promise<IContentSubmission | null> {
    return await ContentSubmission.findOne(filter);
  }

  async findMany(filter: Record<string, any>): Promise<IContentSubmission[]> {
    return await ContentSubmission.find(filter).sort({ createdAt: -1 });
  }

  async update(
    id: string,
    data: Partial<IContentSubmission>
  ): Promise<IContentSubmission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await ContentSubmission.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await ContentSubmission.findByIdAndDelete(id);
    return !!result;
  }
}

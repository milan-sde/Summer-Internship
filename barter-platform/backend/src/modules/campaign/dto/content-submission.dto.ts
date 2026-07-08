import { z } from "zod";

export const CreateContentSubmissionSchema = z.object({
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  caption: z
    .string()
    .max(2200, "Caption must not exceed 2200 characters")
    .optional(),
});

export const UpdateContentSubmissionSchema = z.object({
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  caption: z
    .string()
    .max(2200, "Caption must not exceed 2200 characters")
    .optional(),
});

export const ReviewContentSubmissionSchema = z
  .object({
    status: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
    feedback: z
      .string()
      .max(1000, "Feedback must not exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) =>
      data.status !== "CHANGES_REQUESTED" ||
      (data.feedback && data.feedback.trim().length > 0),
    {
      message: "Feedback is required when requesting changes",
      path: ["feedback"],
    }
  );

export type CreateContentSubmissionDto = z.infer<
  typeof CreateContentSubmissionSchema
>;
export type UpdateContentSubmissionDto = z.infer<
  typeof UpdateContentSubmissionSchema
>;
export type ReviewContentSubmissionDto = z.infer<
  typeof ReviewContentSubmissionSchema
>;

export interface ContentSubmissionResponseDto {
  id: string;
  campaignId: string;
  influencerId: string;
  brandId: string;
  mediaUrl: string;
  mediaPublicId?: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "PUBLISHING"
    | "PUBLISHED"
    | "FAILED";
  revisionNumber: number;
  brandFeedback?: string;
  instagramContainerId?: string;
  instagramMediaId?: string;
  instagramPermalink?: string;
  publishingError?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

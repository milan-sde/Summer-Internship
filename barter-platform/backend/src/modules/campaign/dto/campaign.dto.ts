import { z } from 'zod';

export const CreateCampaignDtoSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  platform: z.enum(['Instagram', 'YouTube', 'Twitter']),
  category: z.enum(['Tech', 'Fashion', 'Food', 'Beauty', 'Other']),
  budget: z.coerce.number().min(0, 'Budget must be positive'),
  totalSlots: z.coerce.number().min(1, 'Slots must be at least 1').default(10),
  followersRequired: z.string().min(1, 'Reach requirement is required').default('1K+'),
  daysLeft: z.coerce.number().min(1).default(35).optional(),
  startDate: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()).default(() => new Date()),
  endDate: z.preprocess((val) => typeof val === 'string' ? new Date(val) : val, z.date()).default(() => new Date(Date.now() + 35 * 24 * 60 * 60 * 1000))
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
});

export type CreateCampaignDto = z.input<typeof CreateCampaignDtoSchema>;

export interface CampaignResponseDto {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo?: string;
  title: string;
  description: string;
  platform: 'Instagram' | 'YouTube' | 'Twitter';
  category: 'Tech' | 'Fashion' | 'Food' | 'Beauty' | 'Other';
  budget: number;
  daysLeft: number;
  startDate?: Date;
  endDate?: Date;
  totalSlots: number;
  filledSlots: number;
  followersRequired: string;
  applicants: any[];
  status: 'ACTIVE' | 'PAST';
  createdAt: Date;
  updatedAt: Date;
}

// Schema for campaigns discovery filter parameters
export const GetCampaignsQuerySchema = z.object({
  category: z.string().optional(),
  platform: z.string().optional(),
  search: z.string().optional(),
  minBudget: z.coerce.number().min(0, 'Minimum budget must be positive').optional(),
  maxBudget: z.coerce.number().min(0, 'Maximum budget must be positive').optional()
});

export type GetCampaignsQueryDto = z.infer<typeof GetCampaignsQuerySchema>;

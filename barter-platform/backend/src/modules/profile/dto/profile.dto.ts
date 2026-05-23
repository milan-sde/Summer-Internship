import { z } from 'zod';

/**
 * Create Profile DTO - First time profile creation
 */
export const CreateProfileDtoSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  
  instagramHandle: z
    .string()
    .min(1, 'Instagram handle is required')
    .max(30, 'Instagram handle must not exceed 30 characters')
    .regex(/^@?[a-zA-Z0-9_.]{1,30}$/, 'Invalid Instagram handle format')
    .transform(val => val.replace('@', '').toLowerCase()),
  
  bio: z
    .string()
    .min(10, 'Bio must be at least 10 characters')
    .max(500, 'Bio must not exceed 500 characters'),
  
  avatarUrl: z
    .string()
    .url('Please provide a valid URL')
    .optional()
    .or(z.literal('')),
  
  website: z
    .string()
    .url('Please provide a valid URL')
    .optional()
    .or(z.literal('')),
  
  location: z
    .string()
    .max(100, 'Location must not exceed 100 characters')
    .optional(),
  
  socialLinks: z.object({
    twitter: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    tiktok: z.string().url().optional().or(z.literal(''))
  }).optional(),
  
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    collaborationAlerts: z.boolean().optional()
  }).optional()
});

export type CreateProfileDto = z.infer<typeof CreateProfileDtoSchema>;

/**
 * Update Profile DTO - All fields optional for partial updates
 */
export const UpdateProfileDtoSchema = CreateProfileDtoSchema.partial();

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;

/**
 * Profile Response DTO - What we send to client
 */
export interface ProfileResponseDto {
  id: string;
  userId: string;
  fullName: string;
  instagramHandle: string;
  bio: string;
  avatarUrl?: string;
  website?: string;
  location?: string;
  role: string;
  stats: {
    followers?: number;
    engagementRate?: number;
    totalPosts?: number;
  };
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  };
  preferences: {
    emailNotifications: boolean;
    collaborationAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search Profiles Query DTO
 */
export const SearchProfilesQuerySchema = z.object({
  q: z.string().min(1).optional(),
  role: z.enum(['INFLUENCER', 'BRAND']).optional(),
  // Coerce query string params to numbers and apply validation/defaults
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1)
});

export type SearchProfilesQueryDto = z.infer<typeof SearchProfilesQuerySchema>;
import { z } from 'zod';

// Schema for profile onboarding registration
export const CreateProfileDtoSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(), // Make optional since brands might submit first/last name
  
  instagramHandle: z
    .string()
    .max(30, 'Instagram handle must not exceed 30 characters')
    .regex(/^@?[a-zA-Z0-9_.]{1,30}$/, 'Invalid Instagram handle format')
    .transform(val => val.replace('@', '').toLowerCase())
    .optional(),
  
  bio: z
    .string()
    .min(10, 'Bio/description must be at least 10 characters')
    .max(500, 'Bio/description must not exceed 500 characters'),
  
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
  }).optional(),

  // Influencer-specific fields
  username: z
    .string()
    .min(1, 'Username is required')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.]{1,30}$/, 'Invalid username format')
    .transform(val => val.toLowerCase())
    .optional(),
  phoneNumber: z
    .string()
    .min(5, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .optional(),
  categories: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  platforms: z.object({
    instagram: z.object({
      username: z.string().optional().or(z.literal('')),
      followers: z.preprocess(val => (val === '' || val === null ? undefined : val), z.coerce.number().optional())
    }).optional(),
    youtube: z.object({
      username: z.string().optional().or(z.literal('')),
      followers: z.preprocess(val => (val === '' || val === null ? undefined : val), z.coerce.number().optional())
    }).optional(),
    twitter: z.object({
      username: z.string().optional().or(z.literal('')),
      followers: z.preprocess(val => (val === '' || val === null ? undefined : val), z.coerce.number().optional())
    }).optional()
  }).optional(),
  pastWorkLinks: z.array(z.string().url('Please provide valid URLs')).optional(),

  // Brand-specific fields
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  industries: z.array(z.string()).optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional()
});

export type CreateProfileDto = z.infer<typeof CreateProfileDtoSchema>;

// Schema for updating profile data (all fields optional)
export const UpdateProfileDtoSchema = CreateProfileDtoSchema.partial();

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;

// Schema for sending profile details back to the client
export interface ProfileResponseDto {
  id: string;
  userId: string;
  fullName: string;
  instagramHandle?: string;
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

  // New fields
  username?: string;
  phoneNumber?: string;
  categories?: string[];
  countries?: string[];
  platforms?: {
    instagram?: { username?: string; followers?: number };
    youtube?: { username?: string; followers?: number };
    twitter?: { username?: string; followers?: number };
  };
  pastWorkLinks?: string[];
  isVerified?: boolean;
  firstName?: string;
  lastName?: string;
  industries?: string[];
  budgetMin?: number;
  budgetMax?: number;
}

// Schema for validating profile search query parameters
export const SearchProfilesQuerySchema = z.object({
  q: z.string().min(1).optional(),
  role: z.enum(['INFLUENCER', 'BRAND']).optional(),
  // Coerce query string params to numbers and apply validation/defaults
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1)
});

export type SearchProfilesQueryDto = z.infer<typeof SearchProfilesQuerySchema>;
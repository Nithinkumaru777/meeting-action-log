import { z } from 'zod';

const EMAIL = 'Enter a valid email address.';
const PASSWORD = 'Password must be at least 6 characters.';
const NAME = 'Enter a name between 2 and 60 characters.';
const ROLE = 'Keep the role under 40 characters.';
const HUE = 'Avatar hue must be between 0 and 359.';

export const loginSchema = z.strictObject({
  email: z
    .string({ error: EMAIL })
    .trim()
    .toLowerCase()
    .max(254, EMAIL)
    .pipe(z.email({ error: EMAIL })),
  password: z.string({ error: PASSWORD }).min(6, PASSWORD).max(100, PASSWORD),
});

export const registerSchema = z.strictObject({
  name: z.string({ error: NAME }).trim().min(2, NAME).max(60, NAME),
  email: z
    .string({ error: EMAIL })
    .trim()
    .toLowerCase()
    .max(254, EMAIL)
    .pipe(z.email({ error: EMAIL })),
  password: z.string({ error: PASSWORD }).min(6, PASSWORD).max(100, PASSWORD),
  role: z.string({ error: ROLE }).trim().max(40, ROLE).optional(),
  avatarHue: z.number({ error: HUE }).int(HUE).min(0, HUE).max(359, HUE).optional(),
});

export const updateProfileSchema = z.strictObject({
  name: z.string({ error: NAME }).trim().min(2, NAME).max(60, NAME).optional(),
  role: z.string({ error: ROLE }).trim().max(40, ROLE).optional(),
  avatarHue: z.number({ error: HUE }).int(HUE).min(0, HUE).max(359, HUE).optional(),
  currentPassword: z.string().min(6, PASSWORD).optional(),
  newPassword: z.string().min(6, PASSWORD).max(100, PASSWORD).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface AuthUser {
  id: string;
  memberId: string;
  name: string;
  email: string;
  role: string;
  avatarHue: number;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface UserStats {
  actionsCount: number;
  openActionsCount: number;
  overdueActionsCount: number;
  completedActionsCount: number;
  meetingsCount: number;
  decisionsCount: number;
}

export interface UserProfileResponse {
  user: AuthUser;
  stats: UserStats;
}

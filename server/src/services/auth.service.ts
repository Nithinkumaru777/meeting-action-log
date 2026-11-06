import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UserProfileResponse,
} from '@mal/shared';
import { todayISO } from '@mal/shared';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { createAuthToken, hashPassword, verifyPassword } from '../utils/auth';
import { UserModel, type UserDoc } from '../models/User';
import { MemberModel } from '../models/Member';
import { ActionModel } from '../models/Action';
import { MeetingModel } from '../models/Meeting';
import { DecisionModel } from '../models/Decision';

function serializeUser(u: UserDoc): AuthUser {
  return {
    id: u.id,
    memberId: u.memberId.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    avatarHue: u.avatarHue,
    createdAt: u.createdAt.toISOString(),
  };
}

export class AuthService {
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists.');
    }

    let member = await MemberModel.findOne({ email });
    if (!member) {
      member = await MemberModel.create({
        name: input.name.trim(),
        email,
        role: input.role?.trim() ?? '',
        avatarHue: input.avatarHue ?? Math.floor(Math.random() * 360),
      });
    } else {
      if (input.name) member.name = input.name.trim();
      if (input.role !== undefined) member.role = input.role.trim();
      if (input.avatarHue !== undefined) member.avatarHue = input.avatarHue;
      await member.save();
    }

    const { hash, salt } = hashPassword(input.password);
    const user = await UserModel.create({
      email,
      passwordHash: hash,
      salt,
      memberId: member._id,
      name: member.name,
      role: member.role,
      avatarHue: member.avatarHue,
    });

    const token = createAuthToken({
      id: user.id,
      memberId: member.id,
      email: user.email,
    });

    return {
      user: serializeUser(user),
      token,
    };
  }

  static async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw ApiError.validation('Invalid email or password.');
    }

    const valid = verifyPassword(input.password, user.passwordHash, user.salt);
    if (!valid) {
      throw ApiError.validation('Invalid email or password.');
    }

    const token = createAuthToken({
      id: user.id,
      memberId: user.memberId.toString(),
      email: user.email,
    });

    return {
      user: serializeUser(user),
      token,
    };
  }

  static async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    const memberId = user.memberId;
    const today = todayISO(env.APP_TIMEZONE);

    const [allActions, attendedMeetings, decisionsLogged] = await Promise.all([
      ActionModel.find({ ownerId: memberId }),
      MeetingModel.countDocuments({ attendeeIds: memberId }),
      DecisionModel.countDocuments({ decidedById: memberId }),
    ]);

    const actionsCount = allActions.length;
    let openActionsCount = 0;
    let overdueActionsCount = 0;
    let completedActionsCount = 0;

    for (const a of allActions) {
      if (a.status === 'done') {
        completedActionsCount++;
      } else {
        openActionsCount++;
        if (a.dueDate < today) {
          overdueActionsCount++;
        }
      }
    }

    return {
      user: serializeUser(user),
      stats: {
        actionsCount,
        openActionsCount,
        overdueActionsCount,
        completedActionsCount,
        meetingsCount: attendedMeetings,
        decisionsCount: decisionsLogged,
      },
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    if (input.newPassword) {
      if (!input.currentPassword) {
        throw ApiError.validation('Current password is required to set a new password.');
      }
      const valid = verifyPassword(input.currentPassword, user.passwordHash, user.salt);
      if (!valid) {
        throw ApiError.validation('Current password is incorrect.');
      }
      const { hash, salt } = hashPassword(input.newPassword);
      user.passwordHash = hash;
      user.salt = salt;
    }

    if (input.name) user.name = input.name.trim();
    if (input.role !== undefined) user.role = input.role.trim();
    if (input.avatarHue !== undefined) user.avatarHue = input.avatarHue;

    await user.save();

    // Sync updates to linked Member record
    const member = await MemberModel.findById(user.memberId);
    if (member) {
      if (input.name) member.name = input.name.trim();
      if (input.role !== undefined) member.role = input.role.trim();
      if (input.avatarHue !== undefined) member.avatarHue = input.avatarHue;
      await member.save();
    }

    return serializeUser(user);
  }

  static async getDemoUsers(): Promise<
    Array<{ id: string; name: string; email: string; role: string; avatarHue: number }>
  > {
    const users = await UserModel.find().limit(6);
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarHue: u.avatarHue,
    }));
  }
}

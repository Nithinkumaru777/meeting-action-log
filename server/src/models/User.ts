import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import { applyToJsonTransform } from '../utils/serialize';

export interface IUser {
  email: string;
  passwordHash: string;
  salt: string;
  memberId: Types.ObjectId;
  name: string;
  role: string;
  avatarHue: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDoc = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    role: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    avatarHue: {
      type: Number,
      min: 0,
      max: 359,
      default: () => Math.floor(Math.random() * 360),
    },
  },
  { timestamps: true },
);

applyToJsonTransform(userSchema);

export const UserModel =
  (mongoose.models.User as mongoose.Model<IUser> | undefined) ??
  mongoose.model<IUser>('User', userSchema);

export type UserObjectId = Types.ObjectId;

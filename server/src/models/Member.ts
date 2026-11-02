import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import { applyToJsonTransform } from '../utils/serialize';

export interface IMember {
  name: string;
  email: string;
  role: string;
  avatarHue: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MemberDoc = HydratedDocument<IMember>;

const memberSchema = new Schema<IMember>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
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

applyToJsonTransform(memberSchema);

export const MemberModel =
  (mongoose.models.Member as mongoose.Model<IMember> | undefined) ??
  mongoose.model<IMember>('Member', memberSchema);

export type MemberObjectId = Types.ObjectId;

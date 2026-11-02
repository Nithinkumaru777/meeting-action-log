import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import { ACTION_STATUSES, PRIORITIES, type ActionStatus, type Priority } from '@mal/shared';
import { applyToJsonTransform } from '../utils/serialize';

export interface IAction {
  meetingId: Types.ObjectId;
  decisionId: Types.ObjectId | null;
  title: string;
  description: string;
  ownerId: Types.ObjectId;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ActionDoc = HydratedDocument<IAction>;

const actionSchema = new Schema<IAction>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
    },
    decisionId: {
      type: Schema.Types.ObjectId,
      ref: 'Decision',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    dueDate: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: ACTION_STATUSES,
      default: 'open',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

actionSchema.index({ status: 1, dueDate: 1 });
actionSchema.index({ ownerId: 1, status: 1 });
actionSchema.index({ meetingId: 1 });
actionSchema.index({ decisionId: 1 });

applyToJsonTransform(actionSchema);

export const ActionModel =
  (mongoose.models.Action as mongoose.Model<IAction> | undefined) ??
  mongoose.model<IAction>('Action', actionSchema);

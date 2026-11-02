import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import { DECISION_STATUSES, type DecisionStatus } from '@mal/shared';
import { applyToJsonTransform } from '../utils/serialize';

export interface IDecision {
  meetingId: Types.ObjectId;
  text: string;
  rationale: string;
  decidedById: Types.ObjectId;
  decidedAt: string;
  status: DecisionStatus;
  noActionReason: string;
  actionIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type DecisionDoc = HydratedDocument<IDecision>;

const decisionSchema = new Schema<IDecision>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200,
    },
    rationale: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    decidedById: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    decidedAt: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: DECISION_STATUSES,
      default: 'pending',
    },
    noActionReason: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    actionIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Action' }],
      default: [],
    },
  },
  { timestamps: true },
);

decisionSchema.index({ status: 1, decidedAt: 1 });
decisionSchema.index({ meetingId: 1 });

applyToJsonTransform(decisionSchema);

export const DecisionModel =
  (mongoose.models.Decision as mongoose.Model<IDecision> | undefined) ??
  mongoose.model<IDecision>('Decision', decisionSchema);

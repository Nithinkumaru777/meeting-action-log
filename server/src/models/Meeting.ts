import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import { applyToJsonTransform } from '../utils/serialize';

export interface IMeeting {
  title: string;
  date: string;
  startTime: string;
  durationMin: number;
  attendeeIds: Types.ObjectId[];
  agenda: string;
  notes: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type MeetingDoc = HydratedDocument<IMeeting>;

const meetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    durationMin: {
      type: Number,
      required: true,
      min: 5,
      max: 480,
    },
    attendeeIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Member', required: true }],
      required: true,
      default: [],
    },
    agenda: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    tags: {
      type: [{ type: String, trim: true, maxlength: 24 }],
      default: [],
    },
  },
  { timestamps: true },
);

meetingSchema.index({ date: -1 });
meetingSchema.index({ title: 'text', agenda: 'text', notes: 'text' });

applyToJsonTransform(meetingSchema);

export const MeetingModel =
  (mongoose.models.Meeting as mongoose.Model<IMeeting> | undefined) ??
  mongoose.model<IMeeting>('Meeting', meetingSchema);

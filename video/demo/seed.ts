// Demo data for the video: the app's own seed, plus one more realistic meeting, so that Karthik carries the most
// late work and the inbox has more to show. Runs only against the MONGODB_URI given by start-demo.mjs.
//   MONGODB_URI=mongodb://127.0.0.1:27099/mal_demo npx tsx video/demo/seed.ts
import mongoose from 'mongoose';
import { addDaysISO, todayISO } from '@mal/shared';
import { ActionModel } from '../../server/src/models/Action';
import { DecisionModel } from '../../server/src/models/Decision';
import { MeetingModel } from '../../server/src/models/Meeting';
import { MemberModel } from '../../server/src/models/Member';
import { seedDatabase } from '../../server/src/seed/seed';

const uri = process.env.MONGODB_URI ?? '';
if (!/:27099\/mal_demo$/.test(uri)) {
  // seedDatabase deletes every record, so refuse anything but the throwaway demo database.
  console.error(`Refusing to seed: ${uri || '(no MONGODB_URI)'} is not the demo database.`);
  process.exit(1);
}

await mongoose.connect(uri);
await seedDatabase();

const today = todayISO('Asia/Kolkata');
const d = (n: number) => addDaysISO(today, n);
const byEmail = async (name: string) => {
  const m = await MemberModel.findOne({ email: `${name}@meetingactionlog.dev` });
  if (!m) throw new Error(`seed member missing: ${name}`);
  return m._id;
};
const [ananya, karthik, priya] = await Promise.all([
  byEmail('ananya.rao'),
  byEmail('karthik.shetty'),
  byEmail('priya.menon'),
]);

const meeting = await MeetingModel.create({
  title: 'Payments vendor review',
  date: d(-4),
  startTime: '14:30',
  durationMin: 40,
  attendeeIds: [ananya, karthik, priya],
  agenda: 'Compare the two gateway quotes and agree the contract value of ₹4,82,350 a year.',
  notes: '',
  tags: ['payments', 'vendor'],
});
await DecisionModel.create({
  meetingId: meeting._id,
  text: 'Sign the annual gateway contract at ₹4,82,350',
  rationale: 'Lower per-transaction fee and better UPI uptime.',
  decidedById: ananya,
  decidedAt: d(-4),
  status: 'pending',
  actionIds: [],
});
await ActionModel.create({
  meetingId: meeting._id,
  decisionId: null,
  title: 'Load test the new checkout API',
  description: 'Target 500 requests a second through the new gateway.',
  ownerId: karthik,
  dueDate: d(-3),
  priority: 'high',
  status: 'open',
  completedAt: null,
});

await mongoose.disconnect();
console.log('Demo data ready.');

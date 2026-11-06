import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/models/User';
import { MemberModel } from '../../src/models/Member';
import { ActionModel } from '../../src/models/Action';
import { MeetingModel } from '../../src/models/Meeting';
import { DecisionModel } from '../../src/models/Decision';

let mongod: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp({
    env: {
      NODE_ENV: 'test',
      CLIENT_ORIGIN: 'http://localhost:5173',
      RATE_LIMIT_PER_MIN: 1_000_000,
    },
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    MemberModel.deleteMany({}),
    ActionModel.deleteMany({}),
    MeetingModel.deleteMany({}),
    DecisionModel.deleteMany({}),
  ]);
});

describe('Auth API (100x)', () => {
  it(
    'registers, logs in, fetches profile with stats, and updates profile',
    { repeats: 100 },
    async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        password: 'Password123!',
        role: 'Tech Lead',
        avatarHue: 140,
      });

      expect(regRes.status).toBe(201);
      expect(regRes.body.data.user.email).toBe('alex.johnson@example.com');
      expect(regRes.body.data.user.name).toBe('Alex Johnson');
      expect(regRes.body.data.token).toBeTruthy();

      const token = regRes.body.data.token as string;
      const memberId = regRes.body.data.user.memberId;

      // Verify Member record was created automatically
      const member = await MemberModel.findById(memberId);
      expect(member).not.toBeNull();
      expect(member?.name).toBe('Alex Johnson');

      // Reject duplicate email registration
      const dupRes = await request(app).post('/api/auth/register').send({
        name: 'Another Alex',
        email: 'ALEX.JOHNSON@example.com',
        password: 'Password123!',
      });
      expect(dupRes.status).toBe(409);

      // Login with valid credentials
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'alex.johnson@example.com',
        password: 'Password123!',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.token).toBeTruthy();

      // Login with invalid password
      const badLoginRes = await request(app).post('/api/auth/login').send({
        email: 'alex.johnson@example.com',
        password: 'WrongPassword!',
      });
      expect(badLoginRes.status).toBe(400);

      // GET /me without token fails
      const noAuthRes = await request(app).get('/api/auth/me');
      expect(noAuthRes.status).toBe(401);

      // GET /me with token returns user
      const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe('alex.johnson@example.com');
      expect(meRes.body.data.name).toBe('Alex Johnson');

      // GET /profile with token returns user + stats
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.user.email).toBe('alex.johnson@example.com');
      expect(profileRes.body.data.stats).toEqual({
        actionsCount: 0,
        openActionsCount: 0,
        overdueActionsCount: 0,
        completedActionsCount: 0,
        meetingsCount: 0,
        decisionsCount: 0,
      });

      // PATCH /profile updates name and role and syncs to Member
      const patchRes = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Alexander Johnson',
          role: 'Staff Architect',
          avatarHue: 200,
        });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.name).toBe('Alexander Johnson');
      expect(patchRes.body.data.role).toBe('Staff Architect');
      expect(patchRes.body.data.avatarHue).toBe(200);

      const updatedMember = await MemberModel.findById(memberId);
      expect(updatedMember?.name).toBe('Alexander Johnson');
      expect(updatedMember?.role).toBe('Staff Architect');
    },
  );

  it('updates password and enforces old password verification', { repeats: 100 }, async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Jordan Smith',
      email: 'jordan@example.com',
      password: 'InitialPassword1!',
    });
    const token = regRes.body.data.token as string;

    // Reject password change with incorrect current password
    const badPwRes = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPassword2!',
      });
    expect(badPwRes.status).toBe(400);

    // Successfully update password
    const okPwRes = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'InitialPassword1!',
        newPassword: 'BrandNewPassword2!',
      });
    expect(okPwRes.status).toBe(200);

    // Old password no longer works
    const oldLoginRes = await request(app).post('/api/auth/login').send({
      email: 'jordan@example.com',
      password: 'InitialPassword1!',
    });
    expect(oldLoginRes.status).toBe(400);

    // New password works
    const newLoginRes = await request(app).post('/api/auth/login').send({
      email: 'jordan@example.com',
      password: 'BrandNewPassword2!',
    });
    expect(newLoginRes.status).toBe(200);
  });

  it('lists demo users', { repeats: 100 }, async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Demo Person',
      email: 'demo@example.com',
      password: 'Password123!',
    });

    const demoRes = await request(app).get('/api/auth/demo-users');
    expect(demoRes.status).toBe(200);
    expect(Array.isArray(demoRes.body.data)).toBe(true);
    expect(demoRes.body.data.length).toBeGreaterThan(0);
    expect(demoRes.body.data[0].name).toBe('Demo Person');
  });
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app';
import User from '../src/models/User';
import Teacher from '../src/models/Teacher';
import Session from '../src/models/Session';

let mongo: MongoMemoryServer | undefined;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Teacher.init(), Session.init()]);
});
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => { await Promise.all([User.deleteMany({}), Teacher.deleteMany({}), Session.deleteMany({})]); });

async function fixtures() {
  const userRes = await request(app).post('/users').send({ fullName: 'Akash Gaur', email: 'akash@example.com', phone: '9876543210' });
  const teacherRes = await request(app).post('/teachers').send({ fullName: 'Ada Teacher', email: 'ada@example.com', specialization: 'Math', experience: 5 });
  return { user: userRes.body.data, teacher: teacherRes.body.data };
}
async function makeSession(teacherId: string, startTime = '2026-11-01T10:00:00.000Z', endTime = '2026-11-01T11:00:00.000Z') {
  return request(app).post('/sessions').send({ teacherId, startTime, endTime });
}

describe('session booking API', () => {
  it('creates users and rejects duplicate emails', async () => {
    const payload = { fullName: 'Akash Gaur', email: 'akash@example.com', phone: '9876543210' };
    expect((await request(app).post('/users').send(payload)).status).toBe(201);
    expect((await request(app).post('/users').send(payload)).status).toBe(409);
    expect((await request(app).post('/users').send({ ...payload, email: 'bad' })).status).toBe(400);
  });
  it('creates teachers and sessions, rejecting invalid ranges and missing teachers', async () => {
    const { teacher } = await fixtures();
    expect((await makeSession(teacher._id, '2026-11-01T11:00:00Z', '2026-11-01T10:00:00Z')).status).toBe(400);
    expect((await makeSession(new mongoose.Types.ObjectId().toString())).status).toBe(404);
    const valid = await makeSession(teacher._id);
    expect(valid.status).toBe(201);
    expect(valid.body.data.status).toBe('AVAILABLE');
    expect(valid.body.data.userId).toBeNull();
    expect(valid.body.data.completedAt).toBeNull();
  });
  it('filters available sessions by UTC calendar day using an aggregation', async () => {
    const { teacher } = await fixtures();
    await makeSession(teacher._id, '2026-11-01T00:00:00Z', '2026-11-01T01:00:00Z');
    await makeSession(teacher._id, '2026-11-02T00:00:00Z', '2026-11-02T01:00:00Z');
    const response = await request(app).get('/sessions/available').query({ dateTimestamp: Date.parse('2026-11-01T12:00:00Z') });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect((await request(app).get('/sessions/available')).status).toBe(400);
  });
  it('books atomically, rejects second booking, and completes booked sessions', async () => {
    const { user, teacher } = await fixtures();
    const created = await makeSession(teacher._id);
    const id = created.body.data._id;
    expect((await request(app).post(`/sessions/${id}/book`).send({ userId: user._id })).status).toBe(200);
    expect((await request(app).post(`/sessions/${id}/book`).send({ userId: user._id })).status).toBe(409);
    const completed = await request(app).patch(`/sessions/${id}/complete`);
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('COMPLETED');
    expect(completed.body.data.completedAt).toBeTruthy();
    expect((await request(app).patch(`/sessions/${id}/complete`)).status).toBe(409);
  });
  it('rejects completing an available session and invalid IDs or missing resources', async () => {
    const { teacher } = await fixtures();
    const created = await makeSession(teacher._id);
    expect((await request(app).patch(`/sessions/${created.body.data._id}/complete`)).status).toBe(409);
    expect((await request(app).post('/sessions/not-an-id/book').send({ userId: new mongoose.Types.ObjectId().toString() })).status).toBe(400);
    expect((await request(app).get('/users/not-an-id/sessions')).status).toBe(400);
    expect((await request(app).get(`/users/${new mongoose.Types.ObjectId()}/sessions`)).status).toBe(404);
    expect((await request(app).post(`/sessions/${new mongoose.Types.ObjectId()}/book`).send({ userId: new mongoose.Types.ObjectId().toString() })).status).toBe(404);
  });
  it('returns user history with teacher data and sorted state groups', async () => {
    const { user, teacher } = await fixtures();
    const upcoming = await makeSession(teacher._id, '2099-11-01T10:00:00Z', '2099-11-01T11:00:00Z');
    await request(app).post(`/sessions/${upcoming.body.data._id}/book`).send({ userId: user._id });
    const old = await makeSession(teacher._id, '2020-11-01T10:00:00Z', '2020-11-01T11:00:00Z');
    await request(app).post(`/sessions/${old.body.data._id}/book`).send({ userId: user._id });
    await request(app).patch(`/sessions/${old.body.data._id}/complete`);
    const response = await request(app).get(`/users/${user._id}/sessions`);
    expect(response.status).toBe(200);
    expect(response.body.data.upcomingSessions).toHaveLength(1);
    expect(response.body.data.upcomingSessions[0].teacher.fullName).toBe('Ada Teacher');
    expect(response.body.data.completedSessions).toHaveLength(1);
  });
});

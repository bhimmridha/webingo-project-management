require('dotenv').config({ path: '../.env' });
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../index');

let accessToken = '';
let projectId = '';
let taskId = '';
const testEmail = `tasktest_${Date.now()}@webingo.test`;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // Register & login
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Task Tester', email: testEmail, password: 'Test@123456' });
  accessToken = reg.body.accessToken;

  // Create a project
  const proj = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Test Project', description: 'For task tests' });
  projectId = proj.body._id;
});

afterAll(async () => {
  const User = require('../models/User');
  const Project = require('../models/Project');
  const Task = require('../models/Task');
  await Task.deleteMany({ project: projectId });
  await Project.findByIdAndDelete(projectId);
  await User.deleteOne({ email: testEmail });
  await mongoose.connection.close();
});

// ── Create Task ───────────────────────────────────────────────────────────────
describe('POST /api/tasks', () => {
  it('should create a task in the project', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('projectId', projectId)
      .field('title', 'My First Task')
      .field('description', 'Task description here')
      .field('priority', 'High')
      .field('status', 'Todo');

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('My First Task');
    expect(res.body.priority).toBe('High');
    expect(res.body.project).toBe(projectId);
    taskId = res.body._id;
  });

  it('should reject task creation without auth', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .field('projectId', projectId)
      .field('title', 'Unauthorized Task');

    expect(res.statusCode).toBe(401);
  });
});

// ── Get Tasks ─────────────────────────────────────────────────────────────────
describe('GET /api/tasks', () => {
  it('should return tasks for a project', async () => {
    const res = await request(app)
      .get(`/api/tasks?projectId=${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should return 400 if projectId missing', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(400);
  });
});

// ── Update Task ───────────────────────────────────────────────────────────────
describe('PUT /api/tasks/:id', () => {
  it('should update task status', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('status', 'In Progress')
      .field('title', 'Updated Task Title');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('In Progress');
    expect(res.body.title).toBe('Updated Task Title');
  });
});

// ── Delete Task ───────────────────────────────────────────────────────────────
describe('DELETE /api/tasks/:id', () => {
  it('should delete the task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });

  it('should return 404 for already deleted task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(404);
  });
});

require('dotenv').config({ path: '../.env' });
const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { app } = require('../index');

let accessToken = '';
let projectId = '';
let taskId = '';
const testEmail = `filetest_${Date.now()}@webingo.test`;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'File Tester', email: testEmail, password: 'Test@123456' });
  accessToken = reg.body.accessToken;

  const proj = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'File Test Project' });
  projectId = proj.body._id;

  const task = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${accessToken}`)
    .field('projectId', projectId)
    .field('title', 'File Upload Task');
  taskId = task.body._id;
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

// ── File Upload via Task Create ───────────────────────────────────────────────
describe('File Upload (POST /api/tasks with attachment)', () => {
  it('should reject file larger than 5MB', async () => {
    // Create a temporary 6MB file
    const tmpPath = path.join(__dirname, 'tmp_large.bin');
    const buf = Buffer.alloc(6 * 1024 * 1024);
    fs.writeFileSync(tmpPath, buf);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('projectId', projectId)
      .field('title', 'Large File Task')
      .attach('attachments', tmpPath);

    fs.unlinkSync(tmpPath);
    // Multer rejects >5MB with 400 or 500
    expect([400, 500]).toContain(res.statusCode);
  });

  it('should reject disallowed file type (.exe)', async () => {
    const tmpPath = path.join(__dirname, 'tmp_exec.exe');
    fs.writeFileSync(tmpPath, Buffer.from('fake exe content'));

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('projectId', projectId)
      .field('title', 'Exe Task')
      .attach('attachments', tmpPath, { contentType: 'application/octet-stream' });

    fs.unlinkSync(tmpPath);
    expect([400, 500]).toContain(res.statusCode);
  });
});

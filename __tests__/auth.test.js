require('dotenv').config({ path: '../.env' });
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../index');

let accessToken = '';
let refreshToken = '';
const testEmail = `test_${Date.now()}@webingo.test`;
const testPassword = 'Test@123456';

// Connect once for all tests
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  // Clean up test user
  const User = require('../models/User');
  await User.deleteOne({ email: testEmail });
  await mongoose.connection.close();
});

// ── Registration ──────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('should register a new user and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.email).toBe(testEmail);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should not register duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'anything' });

    expect(res.statusCode).toBe(401);
  });
});

// ── Get Me ────────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('should return authenticated user data', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(testEmail);
    expect(res.body).not.toHaveProperty('password');
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

// ── Token Refresh ─────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  it('should return new tokens with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ token: refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('should reject invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ token: 'invalid.token.here' });

    expect(res.statusCode).toBe(401);
  });
});

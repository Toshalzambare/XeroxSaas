/**
 * Authentication Tests (Integration)
 * 
 * Tests the complete auth flow: registration → login → token verification.
 * Uses real MongoDB (in-memory) and real bcrypt — no mocking.
 * This catches real bugs like schema changes, validation regressions, and JWT issues.
 */

import request from 'supertest';
import { createTestApp, connectTestDB, clearTestDB, disconnectTestDB } from './setup';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectTestDB();
});

// Clean DB between each test so they don't affect each other
beforeEach(async () => {
  await clearTestDB();
});

// A valid password that meets all requirements
const VALID_PASSWORD = 'TestPass123!';

describe('User Registration - POST /api/auth/register-user', () => {

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: VALID_PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('name', 'Test User');
    expect(res.body).toHaveProperty('email', 'test@example.com');
    expect(res.body).toHaveProperty('role', 'USER');
    expect(res.body).toHaveProperty('token');
    expect(res.body.message).toBe('User registered successfully');
  });

  it('should reject duplicate email', async () => {
    // Register first time
    await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'First User',
        email: 'duplicate@example.com',
        password: VALID_PASSWORD,
      });

    // Try to register again with same email
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: VALID_PASSWORD,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });

  it('should reject registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'No Email User',
        // missing email and password
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please fill all fields');
  });

  it('should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Bad Email User',
        email: 'not-an-email',
        password: VALID_PASSWORD,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid email format');
  });

  it('should reject weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Weak Pass User',
        email: 'weak@example.com',
        password: 'weakpass123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Password too weak');
    expect(res.body.requirements).toContain('At least 1 uppercase letter');
  });

  it('should reject weak password (no number)', async () => {
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Weak Pass User',
        email: 'weak@example.com',
        password: 'WeakPass!!',
      });

    expect(res.status).toBe(400);
    expect(res.body.requirements).toContain('At least 1 number');
  });

  it('should reject weak password (too short)', async () => {
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Short Pass',
        email: 'short@example.com',
        password: 'Ab1!',
      });

    expect(res.status).toBe(400);
    expect(res.body.requirements).toContain('At least 8 characters');
  });

  it('should trim and lowercase email', async () => {
    const res = await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Case Test',
        email: '  TEST@EXAMPLE.COM  ',
        password: VALID_PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@example.com');
  });
});

describe('User Login - POST /api/auth/login', () => {

  // Register a user before login tests
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register-user')
      .send({
        name: 'Login Test User',
        email: 'login@example.com',
        password: VALID_PASSWORD,
      });
  });

  it('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: VALID_PASSWORD,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('email', 'login@example.com');
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'USER');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'WrongPass123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should reject login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@example.com',
        password: VALID_PASSWORD,
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should reject login with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email and password are required');
  });

  it('should return a valid JWT token on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: VALID_PASSWORD,
      });

    // JWT tokens have 3 parts separated by dots
    const token = res.body.token;
    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('Shop Owner Registration - POST /api/auth/register-shop', () => {

  it('should register a shop owner with OWNER role', async () => {
    const res = await request(app)
      .post('/api/auth/register-shop')
      .send({
        name: 'Shop Owner',
        email: 'owner@example.com',
        password: VALID_PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('role', 'OWNER');
    expect(res.body.message).toBe('Shop Owner registered successfully');
  });
});

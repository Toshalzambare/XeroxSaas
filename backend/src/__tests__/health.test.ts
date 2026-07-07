/**
 * Health Check Tests (Basic)
 * 
 * The simplest possible tests — verify the server starts and responds.
 * If THESE fail, something is fundamentally broken.
 */

import request from 'supertest';
import { createTestApp, connectTestDB, disconnectTestDB } from './setup';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Health Check Endpoints', () => {
  
  // Test 1: Root endpoint
  it('GET / should return status Active', async () => {
    const res = await request(app).get('/');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'Active');
    expect(res.body).toHaveProperty('system', 'XeroxSaaS Backend');
  });

  // Test 2: API health endpoint (used by K8s readiness/liveness probes)
  it('GET /api/health should return status ok', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  // Test 3: Non-existent route returns 404
  it('GET /api/nonexistent should return 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    
    expect(res.status).toBe(404);
  });

  // Test 4: Security headers are present (Helmet)
  it('should include security headers from Helmet', async () => {
    const res = await request(app).get('/');
    
    // Helmet sets these headers
    expect(res.headers).toHaveProperty('x-content-type-options');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  // Test 5: CORS headers
  it('should include CORS headers', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');
    
    expect(res.headers).toHaveProperty('access-control-allow-origin');
  });
});

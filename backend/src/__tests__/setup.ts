/**
 * Test Setup — Shared test infrastructure
 * 
 * This file creates an isolated Express app for testing:
 * - Uses mongodb-memory-server (in-RAM MongoDB, no Docker needed)
 * - Does NOT start the HTTP server (supertest handles that)
 * - Does NOT connect to Redis (rate limiting uses in-memory fallback)
 * - Each test file gets a clean database state
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../routes/authRoutes';
import shopRoutes from '../routes/shopRoutes';
import {
  sanitizeInput,
  preventParamPollution,
} from '../middlewares/securityMiddleware';

let mongoServer: MongoMemoryServer;

/**
 * Create a fresh Express app for testing.
 * This mirrors server.ts but WITHOUT:
 * - Socket.io (not needed for HTTP tests)
 * - Redis connection (not needed, rate limiters fall back to in-memory)
 * - Morgan logging (noisy in test output)
 * - Rate limiters (they'd block repeated test requests)
 */
export function createTestApp() {
  const app = express();

  // Core middleware (same as production)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));
  app.use(cors());
  app.use(helmet());
  app.use(sanitizeInput);
  app.use(preventParamPollution);

  // Routes (same as production, but WITHOUT rate limiters)
  app.use('/api/auth', authRoutes);
  app.use('/api/shops', shopRoutes);

  // Health check (same as production)
  app.get('/', (_req, res) => {
    res.send({
      status: 'Active',
      system: 'XeroxSaaS Backend',
    });
  });

  // Dedicated health endpoint for K8s probes (added for DevOps)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

/**
 * Connect to in-memory MongoDB before all tests in this file
 */
export async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Set env vars that the app code expects
  process.env.JWT_SECRET = 'test-jwt-secret-for-ci';
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = uri;

  await mongoose.connect(uri);
}

/**
 * Clear all collections between tests (isolation)
 */
export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnect and stop in-memory MongoDB after all tests
 */
export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
}

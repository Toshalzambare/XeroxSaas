/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: [],
  globalSetup: undefined,
  globalTeardown: undefined,
  // Use a separate tsconfig for tests
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  // Don't collect coverage from test files themselves
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/__tests__/**',
    '!src/scripts/**',
  ],
  // Timeout for tests (mongodb-memory-server can be slow on first run)
  testTimeout: 30000,
};

// Jest setup file
global.fetch = require('node-fetch');

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    problem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userAiSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    userProblemStats: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    mentorConversationSummary: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    mentorConversationMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    mentorSession: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    cacheEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Silence console.log during tests unless needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
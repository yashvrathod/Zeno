module.exports = {
  collectCoverageFrom: [
    'lib/mentor/**/*.{ts,tsx}',
    '!lib/mentor/**/*.d.ts',
    '!lib/mentor/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    'ts-jest': {
      tsconfig: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        jsx: 'react'
      }
    }
  },
  maxWorkers: 4,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  preset: 'ts-jest',
  roots: ['<rootDir>/lib', '<rootDir>/app'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testTimeout: 30000,
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
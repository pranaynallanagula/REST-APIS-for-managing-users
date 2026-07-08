/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['reflect-metadata'],
  testMatch: ['**/tests/**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/config/data-source.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};

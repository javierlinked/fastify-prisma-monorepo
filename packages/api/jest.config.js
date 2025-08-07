module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^@asafe/types$': '<rootDir>/../types/src/index.ts',
    '^@asafe/services$': '<rootDir>/../services/src/index.ts',
    '^@asafe/utilities$': '<rootDir>/../utilities/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@asafe/.*))',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

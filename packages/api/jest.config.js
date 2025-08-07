const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    '^@asafe/types$': '<rootDir>/../types/src/index.ts',
    '^@asafe/services$': '<rootDir>/../services/src/index.ts',
    '^@asafe/utilities$': '<rootDir>/../utilities/src/index.ts',
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

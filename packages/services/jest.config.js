const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    '^@asafe/types$': '<rootDir>/../types/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

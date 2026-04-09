/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src/tests"],
  testMatch: ["**/*.test.ts"],
  setupFiles: ["<rootDir>/src/tests/setup-env.cjs"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "node16",
          moduleResolution: "node16",
          isolatedModules: true,
        },
      },
    ],
  },
  clearMocks: true,
  restoreMocks: true,
};

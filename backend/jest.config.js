module.exports = {
  collectCoverageFrom: [
    "src/app.js",
    "src/middleware/*.js",
    "src/services/*AccessService.js",
    "src/services/financialCorrectionService.js",
    "src/services/financePolicyService.js",
    "src/services/varianceService.js",
    "src/utils/tokenUtils.js",
  ],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
    },
  ],
};

/**
 * @type {import('ts-jest/dist/types').InitialOptionsTsJest}
 * https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
 * https://jestjs.io/docs/configuration#testenvironment-string
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: [
    // "Login.test.ts",
    // "routes.test.ts",
    // "user.test.ts",
    // "gqlCall.test.ts",
    "./dist/",
    "./node_modules/",
  ], // file path patterns - skip any test matching these regexp patterns
  watchPathIgnorePatterns: ["./dist/", "./node_modules/"], // file path patterns - do not trigger a re-run of tests
};

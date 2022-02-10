/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

// https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
// https://jestjs.io/docs/configuration#testenvironment-string
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  coveragePathIgnorePatterns: [
    // Testing migrations COULD be of value - e.g. monitor DB performance degradation, data preservation or such
    // For now, migration tests are considered too expensive - or the value is too low at current project state, so
    // migrations are ignored with regard to coverage
    "/src/orm/migration/", // https://jestjs.io/docs/configuration#coveragepathignorepatterns-arraystring
    "User.playground.resolver.ts", // this would never go into production anyway
  ],
  testPathIgnorePatterns: [
    "/dist/", // https://jestjs.io/docs/configuration#testpathignorepatterns-arraystring
    "/node_modules/",
    // "testConn.test.[jt]s",
    // "gqlCall.test.[jt]s",
    // "auth.test.[jt]s",
    // "resetPasswordForm.test.[jt]s",
    // "verifyPasswordReset.test.[jt]s",
    // "error.test.[jt]s",
    // "routes.test.[jt]s",
    // "user.test.[jt]s",
    // "Register.test.[jt]s",
    // "Login.test.[jt]s",
  ], // file path patterns - skip any test matching these regexp patterns
  watchPathIgnorePatterns: [
    "/dist/", // https://jestjs.io/docs/configuration#watchpathignorepatterns-arraystring
    "/node_modules/",
  ], // file path patterns - do not trigger a re-run of tests
};

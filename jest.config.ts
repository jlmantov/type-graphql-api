import type { Config } from "@jest/types";

// Sync object - https://jestjs.io/docs/configuration
const config: Config.InitialOptions = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)", // https://jestjs.io/docs/configuration#testmatch-arraystring
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
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
  ], // file path patterns - skip any test matching these regexp patterns
  watchPathIgnorePatterns: [
    "/dist/", // https://jestjs.io/docs/configuration#watchpathignorepatterns-arraystring
    "/node_modules/",
  ], // file path patterns - do not trigger a re-run of tests
};

export default config;

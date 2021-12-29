import { testConn } from "./testConn";

/**
 * async function call -
 * resetTestDB.ts is called from package.json to initialize automated tests (ts-jest)
 *
 * Create an initial DB connection pool that does the following:
 * 1. drop schema in order to start on a fresh test
 * 2. synchronize src/orm/entity/ objects with the schema: create tables
 * 3. exit process when db/tables are ready
 */
testConn(true).then((conn) => {
  console.log("Reset Test DB: ", JSON.stringify(conn.options.database));
  process.exit();
});

import { User } from "../orm/entity/User";
import { UserEmail } from "../orm/entity/UserEmail";
import { testConn } from "./testConn";

/**
 * Dropping the whole schema seems like a bad idea. Sometimes some of the tests fail due to missing connection
 * resetTestDB.ts is called from package.json to initialize automated tests (ts-jest)
 *
 * Clear/truncate all tables
 */
export const resetTestDB = async () => {
  const conn = await testConn();
  await conn.getRepository(User).clear();
  await conn.getRepository(UserEmail).clear();

  console.log(
    "Reset " +
      conn.options.database +
      "\n - User entities: " +
      (await conn.getRepository(User).count()) +
      "\n - UserEmail entities " +
      (await conn.getRepository(UserEmail).count())
  );
  process.exit();
};
resetTestDB();

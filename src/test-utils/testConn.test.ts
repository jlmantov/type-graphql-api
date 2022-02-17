import faker from "faker";
import { Connection } from "typeorm";
import { registerMutation } from "../graphql/modules/user/register/Register.test";
import logger from "../utils/middleware/winstonLogger";
import { gqlCall } from "./gqlCall";
import testConn from "./testConn";

// This test suite is provided to validate the testing tool. Since it
describe("testConn test-util", () => {
  let conn: Connection;

  beforeAll(async () => {
    logger.info(" --- testConn.test.ts");
    // provide test data in DB before testConn.clear() is called
    const fakeUser = {
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(8),
    };
    await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });
  });

  afterEach(async () => {
    // 'expect' ends a test case, causing continuation to become unpredictable.
    // Closing connection needs to be done here
    if (conn && conn.isConnected) {
      // logger.debug("closing DB connection");
      await testConn.close();
    }
  });

  test("testConn.create - success", async () => {
    // logger.debug("before create - conn: ", conn?.driver?.options);
    expect(conn).toBeUndefined();
    conn = await testConn.create();
    // logger.debug("after create - conn: ", conn?.driver?.options);
    expect(conn).toBeDefined();
    expect(conn.isConnected).toBe(true);

    const entities = conn.entityMetadatas;
    const entityPromises = entities.map(async (entity) => {
      const repo = conn.getRepository(entity.name);
      const response = await repo.findOneOrFail();
      // logger.debug("entity:", response);
      expect(response).toBeDefined();
      return response;
    });
    const result = await Promise.all(entityPromises);
    expect(result.length).toEqual(entities.length);
  });

  test("testConn.close - success", async () => {
    if (conn === undefined || !conn.isConnected) {
      conn = await testConn.create();
    }
    // logger.debug("before close - isConnected: ", conn.isConnected, " conn: ", conn?.driver?.options);
    expect(conn).toBeDefined();
    expect(conn.isConnected).toBe(true);

    await testConn.close();
    expect(conn.isConnected).toBe(false);
  });

  test("testConn.close on closed connection - failure", async () => {
    if (conn === undefined || !conn.isConnected) {
      conn = await testConn.create();
    }
    // logger.debug("before close - isConnected: ", conn.isConnected, " conn: ", conn?.driver?.options);
    expect(conn).toBeDefined();
    expect(conn.isConnected).toBe(true);

    await testConn.close();
    expect(conn.isConnected).toBe(false);

    try {
      await testConn.close();
    } catch (error) {
      expect(error).toBeDefined();
      expect(conn.isConnected).toBe(false);
    }
  });

  // NB: this test case deletes ALL data from other test cases
  test("testConn.clear - get clear results", async () => {
    conn = await testConn.create();
    let entities = conn.entityMetadatas;

    const entitiesMap = new Map();
    for (const entity of entities) {
      const repo = conn.getRepository(entity.name);
      // const qRes = await repo.clear();
      // https://dev.mysql.com/doc/internals/en/generic-response-packets.html
      const qRes = await repo.query(`SELECT count(*) as count FROM ${entity.tableName}`);
      // logger.debug(`Before clear: ${entity.name} - ${qRes[0].count} row(s)`);
      entitiesMap.set(entity.name, {
        entityName: entity.name,
        rowsBefore: Number(qRes[0].count),
        // res: qRes,
        cleared: -1,
        rowsAfter: -1,
      });
      // logger.debug(`Entity mapped: ${JSON.stringify(entitiesMap.get(entity.name), null, 2)}`);
    }

    // await testConn.clear();
    const clearResult = await testConn.clear();
    expect(clearResult.length).toBeGreaterThan(0);

    // logger.debug("clearResult:", clearResult);
    for (const res of clearResult) {
      entitiesMap.set(res.entityName, {
        ...entitiesMap.get(res.entityName),
        cleared: Number(res.result?.affectedRows),
      });
      // logger.debug(`Entity cleared: ${JSON.stringify(entitiesMap.get(res.entityName), null, 2)}`);
    }

    for (const entity of entities) {
      const repo = conn.getRepository(entity.name);
      // const qRes = await repo.clear();
      // https://dev.mysql.com/doc/internals/en/generic-response-packets.html
      const qRes = await repo.query(`SELECT count(*) as count FROM ${entity.tableName}`);
      // logger.debug(`Before clear: ${entity.name} - ${qRes[0].count} row(s)`);
      entitiesMap.set(entity.name, {
        ...entitiesMap.get(entity.name),
        rowsAfter: Number(qRes[0].count),
      });
      // logger.debug(`Entity after: ${JSON.stringify(entitiesMap.get(entity.name), null, 2)}`);
    }

    // logger.debug(`Entity keys:`, entitiesMap.keys());
    for (const key of entitiesMap.keys()) {
      const entity = entitiesMap.get(key);
      expect(entity.rowsBefore).toEqual(entity.cleared);
      expect(entity.rowsAfter).toBe(0);
      // logger.debug("Entity cleared succesfully: ", entity.entityName);
    }
  });
});

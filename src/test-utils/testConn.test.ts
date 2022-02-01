import faker from "faker";
import { Connection } from "typeorm";
import { registerMutation } from "../graphql/modules/user/register/Register.test";
import { gqlCall } from "./gqlCall";
import testConn from "./testConn";

/**
 * the graphql schema is called directly, using the graphql(...) function.
 * graphql takes some input arguments - like a schema, query/mutation
 *
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in the helper-function: gqlCall
 */

describe("testConn test-util", () => {
  let conn: Connection;

  beforeAll(async () => {
    // make sure data is present in DB before testConn.clear() is called
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
    if (conn && conn.isConnected) {
      // console.log("closing DB connection");
      await testConn.close();
    }
    // console.log("isConnected:", !!(conn && conn.isConnected));
  });

  /**
   *
   */
  test("testConn.create - success", async () => {
    // console.log("before create - conn: ", conn?.driver?.options);
    expect(conn).toBeUndefined();
    conn = await testConn.create();
    // console.log("after create - conn: ", conn?.driver?.options);
    expect(conn).toBeDefined();
    expect(conn.isConnected).toBe(true);

    const entities = conn.entityMetadatas;
    const entityPromises = entities.map(async (entity) => {
      const repo = conn.getRepository(entity.name);
      const response = await repo.findOneOrFail();
      // console.log("entity:", response);
      expect(response).toBeDefined();
      return response;
    });
    const result = await Promise.all(entityPromises);
    expect(result.length).toEqual(entities.length);
    // await conn.close(); // 'expect' ends the test case, so this line might be unreachable
  });

  /**
   *
   */
  test("testConn.close - success", async () => {
    if (conn === undefined || !conn.isConnected) {
      conn = await testConn.create();
    }
    // console.log("before close - isConnected: ", conn.isConnected, " conn: ", conn?.driver?.options);
    expect(conn).toBeDefined();
    expect(conn.isConnected).toBe(true);

    await testConn.close();
    expect(conn.isConnected).toBe(false);
  });

  /**
   *
   */
  test("testConn.close on closed connection - failure", async () => {
    if (conn === undefined || !conn.isConnected) {
      conn = await testConn.create();
    }
    // console.log("before close - isConnected: ", conn.isConnected, " conn: ", conn?.driver?.options);
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

  /**
   *
   */
  test("testConn.clear - get clear results", async () => {
    conn = await testConn.create();
    let entities = conn.entityMetadatas;

    const entitiesMap = new Map();
    for (const entity of entities) {
      const repo = conn.getRepository(entity.name);
      // const qRes = await repo.clear();
      // https://dev.mysql.com/doc/internals/en/generic-response-packets.html
      const qRes = await repo.query(`SELECT count(*) as count FROM ${entity.tableName}`);
      // console.log(`Before clear: ${entity.name} - ${qRes[0].count} row(s)`);
      entitiesMap.set(entity.name, {
        entityName: entity.name,
        rowsBefore: Number(qRes[0].count),
        // res: qRes,
        cleared: -1,
        rowsAfter: -1,
      });
      // console.log(`Entity mapped: ${JSON.stringify(entitiesMap.get(entity.name), null, 2)}`);
    }

    // await testConn.clear();
    const clearResult = await testConn.clear();
    expect(clearResult.length).toBeGreaterThan(0);

    // console.log("clearResult:", clearResult);
    for (const res of clearResult) {
      entitiesMap.set(res.entityName, {
        ...entitiesMap.get(res.entityName),
        cleared: Number(res.result?.affectedRows),
      });
      // console.log(`Entity cleared: ${JSON.stringify(entitiesMap.get(res.entityName), null, 2)}`);
    }

    for (const entity of entities) {
      const repo = conn.getRepository(entity.name);
      // const qRes = await repo.clear();
      // https://dev.mysql.com/doc/internals/en/generic-response-packets.html
      const qRes = await repo.query(`SELECT count(*) as count FROM ${entity.tableName}`);
      // console.log(`Before clear: ${entity.name} - ${qRes[0].count} row(s)`);
      entitiesMap.set(entity.name, {
        ...entitiesMap.get(entity.name),
        rowsAfter: Number(qRes[0].count),
      });
      // console.log(`Entity after: ${JSON.stringify(entitiesMap.get(entity.name), null, 2)}`);
    }

    // console.log(`Entity keys:`, entitiesMap.keys());
    for (const key of entitiesMap.keys()) {
      const entity = entitiesMap.get(key);
      expect(entity.rowsBefore).toEqual(entity.cleared);
      expect(entity.rowsAfter).toBe(0);
      // console.log("Entity cleared succesfully: ", entity.entityName);
    }

    // await conn.close(); // 'expect' ends the test case, so this line might be unreachable
  });
});

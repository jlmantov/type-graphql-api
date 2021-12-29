import { createConnection } from "typeorm";

/**
 * TypeORM createConnection to a database specifically created for unit testing.
 *
 * testConn(false) - default:
 * 1. return connection
 *
 * testConn(true):
 * 1. synchronize ORM entity objects with the schema
 * 2. drop the schema if specified by input parameter is true.
 * 3. return connection
 *
 * This is how the testing entry-point will always be the same.
 *
 * @param init - true: drop schema, false: keep existing schema
 * @returns TypeORM DB Connection
 */
export const testConn = (init: boolean = false) => {
  // https://typeorm.io/#connection-options/mysql--mariadb-connection-options
  return createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "user",
    password: "password",
    database: "sandbox-test",
    charset: "utf8_danish_ci",
    timezone: "+1:00",
    synchronize: init,
    dropSchema: init,
    entities: [__dirname + "/../orm/entity/**/*.ts"],
  });
};

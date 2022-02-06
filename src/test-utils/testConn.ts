import dotenv from "dotenv";
import { createConnection, getConnection } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import logger from "../utils/middleware/winstonLogger";

/**
 * TypeORM createConnection to a database specifically created for unit testing.
 */
const connection = {
  async create() {
    // package.json ex.: mycmd: "set NODE_ENV=test && npm run mycmd" => NODE_ENV='test ' due to the whitespace before '&&'
    const envfile = __dirname + "/../../.env." + (process.env.NODE_ENV?.trim() || "test");
    const envConf = dotenv.config({ path: envfile });
    if (envConf?.parsed?.DOMAIN === "localhost") {
      // logger.debug("Configuration environment:("+ envConf?.parsed?.NODE_ENV +")");
    }

    const connOptions: MysqlConnectionOptions = {
      type: "mysql",
      host: process.env.TYPEORM_HOST || "localhost",
      port: Number(process.env.TYPEORM_PORT || "3306"),
      username: process.env.TYPEORM_USERNAME,
      password: process.env.TYPEORM_PASSWORD,
      database: process.env.TYPEORM_DATABASE,
      charset: process.env.TYPEORM_CHARSET,
      timezone: "+1:00",
      synchronize: process.env.TYPEORM_SYNCHRONIZE === "true" ? true : false,
      dropSchema: process.env.TYPEORM_DROP_SCHEMA === "true" ? true : false,
      entities: [`${process.env.TYPEORM_ENTITIES}`],
      migrations: [`${process.env.TYPEORM_MIGRATIONS}`],
      subscribers: [`${process.env.TYPEORM_SUBSCRIBERS}`],
    };
    logger.debug(
      "testConn config (env = "+ envConf?.parsed?.NODE_ENV +"): "+
        "[" + process.env.TYPEORM_DATABASE + "]" +
        "'" + connOptions.username + "'@'" + connOptions.host + "':" + connOptions.port
    );
    const conn = await createConnection(connOptions);
    return conn;
  },

  async close() {
    return await getConnection().close();
  },

  async clear() {
    const conn = getConnection();
    if (!conn.isConnected) {
      throw new Error("TypeORM NOT connected, unable to clear entities!");
    }

    const entities = conn.entityMetadatas;
    const clearResults = [];
    for (const entity of entities) {
      const repo = conn.getRepository(entity.name);
      const qRes = await repo.query(`DELETE FROM ${entity.tableName}`); // https://dev.mysql.com/doc/internals/en/generic-response-packets.html
      // logger.debug(`Clearing ${entity.name} - result:`, JSON.stringify(qRes, null, 2));
      clearResults.push({ entityName: entity.name, result: qRes });
    }
    return clearResults;
  },
};

export default connection;

import dotenv from "dotenv";
import { createConnection, getConnection } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";

/**
 * TypeORM createConnection to a database specifically created for unit testing.
 *
 * @returns TypeORM DB Connection
 */
const connection = {
  async create() {
    // package.json ex.: mycmd: "set NODE_ENV=test && npm run mycmd" => NODE_ENV='test ' due to the whitespace before '&&'
    const envfile = __dirname + "/../../.env." + (process.env.NODE_ENV?.trim() || "test");
    const envConf = dotenv.config({ path: envfile });
    if (envConf?.parsed?.DOMAIN === "localhost") {
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
    console.log(
      "testConn config: [" +
        process.env.TYPEORM_DATABASE +
        "]" +
        "'" +
        connOptions.username +
        "'@'" +
        connOptions.host +
        "':" +
        connOptions.port
    );
    const conn = await createConnection(connOptions);
    return conn;
  },

  async close() {
    await getConnection().close();
  },

  async clear() {
    const connection = getConnection();
    const entities = connection.entityMetadatas;

    entities.forEach(async (entity) => {
      const repository = connection.getRepository(entity.name);
      await repository.query(`DELETE FROM ${entity.tableName}`);
    });
  },
};

export default connection;

import dotenv from "dotenv";
import { createConnection } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";

/**
 * TypeORM createConnection to a database specifically created for unit testing.
 * @returns TypeORM DB Connection
 */
export const testConn = async () => {
  const envfile = __dirname + "/../../.env." + (process.env.NODE_ENV || "test");
  await dotenv.config({ path: envfile });

  const connectionOptions: MysqlConnectionOptions = {
    type: "mysql",
    host: process.env.TYPEORM_HOST || "localhost",
    port: parseInt(process.env.TYPEORM_PORT || "3306", 10),
    username: process.env.TYPEORM_USERNAME,
    password: process.env.TYPEORM_PASSWORD,
    database: process.env.TYPEORM_DATABASE,
    charset: process.env.TYPEORM_CHARSET,
    timezone: "+1:00",
    synchronize: process.env.TYPEORM_ENTITIES === "true" ? true : false,
    dropSchema: process.env.TYPEORM_DROP_SCHEMA === "true" ? true : false,
    entities: [`${process.env.TYPEORM_ENTITIES}`],
    migrations: [`${process.env.TYPEORM_MIGRATIONS}`],
    subscribers: [`${process.env.TYPEORM_SUBSCRIBERS}`],
  };

  return await createConnection(connectionOptions);
};

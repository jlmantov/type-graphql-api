import dotenv from "dotenv";
import { ConnectionOptions } from "typeorm";

/**
 * whitespace in NODE_ENV - package.json example:
 * "scripts": {
 *    "mycmd": "set NODE_ENV=test && npm run mycmd" => NODE_ENV='test ' due to the whitespace before '&&'
 * }
 */
const configName = process.env.NODE_ENV?.trim() || "development";
const envfile = __dirname + "/../../.env." + configName;
console.log("configName: '" + configName + "', envfile: '" + envfile + "'");
const envConf = dotenv.config({ path: envfile });
if (envConf?.parsed?.DOMAIN === "localhost") {
  console.log("Configuration environment:", envConf?.parsed?.NODE_ENV);
}

const ORMConfig: ConnectionOptions = {
  name: "default",
  type: "mysql",
  host: process.env.TYPEORM_HOST || "localhost",
  port: Number(process.env.TYPEORM_PORT || 3306),
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE,
  charset: process.env.TYPEORM_CHARSET,
  timezone: "+1:00",
  synchronize: !!process.env.TYPEORM_SYNCHRONIZE,
  dropSchema: !!process.env.TYPEORM_DROP_SCHEMA,
  migrationsTableName: "migrations",
  entities: [String(process.env.TYPEORM_ENTITIES)],
  migrations: [String(process.env.TYPEORM_MIGRATIONS)],
  subscribers: [String(process.env.TYPEORM_SUBSCRIBERS)],
  cli: {
    entitiesDir: String(process.env.TYPEORM_ENTITIES_DIR),
    migrationsDir: String(process.env.TYPEORM_MIGRATIONS_DIR),
    subscribersDir: String(process.env.TYPEORM_SUBSCRIBERS_DIR),
  },
};
(configName !== "prod") && console.log("ORMConfig", ORMConfig);

export = ORMConfig;

import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import dotenv from "dotenv";
import "reflect-metadata";
import { createConnection } from "typeorm";
import app from "./app";
import { createSchema } from "./graphql/utils/createSchema";
import logger from "./utils/middleware/winstonLogger";

// lambda function calling itself immediately (closure) - bootstrap - https://typegraphql.com/docs/bootstrap.html#create-an-http-graphql-endpoint
(async () => {
  // development, test, production etc.
  // package.json ex.: mycmd: "set NODE_ENV=test && npm run mycmd" => NODE_ENV='test ' due to the whitespace before '&&'
  const envfile = __dirname + "/../.env." + (process.env.NODE_ENV?.trim() || "development");
  const envConf = dotenv.config({ path: envfile });
  if (envConf?.parsed?.DOMAIN === "localhost") {
    logger.debug("Configuration environment: " + envConf?.parsed?.NODE_ENV);
  }

  await createConnection(); // create database connection

  // Apply GraphQL stuff
  // https://www.apollographql.com/docs/apollo-server/v2/api/apollo-server/#middleware-specific-context-fields
  const graphqlServer = new ApolloServer({
    schema: await createSchema(),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
    context: ({ req, res }) => ({ req, res }),
    debug: false, // graphql stacktrace: https://www.apollographql.com/docs/apollo-server/data/errors/#omitting-or-including-stacktrace
  });

  // body-parser included: https://www.apollographql.com/docs/apollo-server/v2/migration-two-dot/#simplified-usage
  // add the express server as middleware to the GaphQL server
  // https://www.apollographql.com/docs/apollo-server/v2/migration-two-dot/#apollo-server-2-new-pattern
  await graphqlServer.start();

  // apollo-server-express/src/ApolloServer.ts/applyMiddleware({ app, ...rest }):
  // app.use(this.getMiddleware({ path: "/graphql"}))
  await graphqlServer.applyMiddleware({ app, path: "/graphql" });

  const port = process.env.PORT!;
  app.listen(port, () => {
    logger.info(`Express server started at port ${port}`);
  });
})();

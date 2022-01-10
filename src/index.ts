import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import dotenv from "dotenv";
import "reflect-metadata";
import { createConnection } from "typeorm";
import app from "./app";
import { createSchema } from "./graphql/utils/createSchema";

// lambda function calling itself immediately - bootstrap - https://typegraphql.com/docs/bootstrap.html#create-an-http-graphql-endpoint
const bootstrap = async () => {
  // development, test, production etc.
  const envfile = __dirname + "/../.env." + (process.env.NODE_ENV || "development");
  dotenv.config({ path: envfile });

  await createConnection(); // create database connection

  // Apply GraphQL stuff
  // https://www.apollographql.com/docs/apollo-server/v2/api/apollo-server/#middleware-specific-context-fields
  const graphqlServer = new ApolloServer({
    schema: await createSchema(),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
    context: ({ req, res }) => ({ req, res }),
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
    console.log(`Express server started at port ${port}`);
  });
};

bootstrap();

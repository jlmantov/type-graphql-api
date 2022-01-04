import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import "dotenv/config";
import "reflect-metadata";
import { createConnection } from "typeorm";
import app from "./app";
import { createSchema } from "./graphql/utils/createSchema";

// lambda function calling itself immediately - bootstrap - https://typegraphql.com/docs/bootstrap.html#create-an-http-graphql-endpoint
(async () => {
  await createConnection(); // create database connection.
  // In case synchronization is set to true, any missing tables and fields will be created
  // ... which is helpful in development - make sure synchronization is NOT used in PRODUCTION

  // Apply GraphQL stuff
  const graphqlServer = new ApolloServer({
    schema: await createSchema(),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
    context: ({ req, res }) => ({ req, res }),
  });

  // add the express server as middleware to the GaphQL server - meaning that express is served first
  await graphqlServer.start();
  await graphqlServer.applyMiddleware({ app });

  const port = process.env.PORT!;
  app.listen(port, () => {
    console.log(`Express server started at port ${port}`);
  });
})();

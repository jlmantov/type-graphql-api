import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import "reflect-metadata";
import { createConnection } from "typeorm";
import { handleJwtRefreshTokenRequest } from "./utils/auth";
import { createSchema } from "./utils/createSchema";
import { CONFIRMUSER, confirmUserEmail } from "./utils/sendEmail";

// lambda function calling itself immediately - bootstrap - https://typegraphql.com/docs/bootstrap.html#create-an-http-graphql-endpoint
(async () => {
  const app = express();
  app.use(cookieParser());
  app.post("/renew_accesstoken", async (req, res) => handleJwtRefreshTokenRequest(req, res));
  app.get("/user/" + CONFIRMUSER + "/:id", async (req, res, _next) => confirmUserEmail(req, res));
  app.get("/", (_req, res) => res.send("hello")); // send 'hello' to http://localhost:4000/

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

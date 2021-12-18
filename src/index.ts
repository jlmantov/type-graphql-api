import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import "reflect-metadata";
import { createConnection } from "typeorm";
import { handleJwtRefreshTokenRequest } from "./utils/auth";
import { createSchema } from "./utils/createSchema";
import { confirmEmail } from "./utils/sendConfirmationEmail";

// lambda function calling itself immediately - bootstrap - https://typegraphql.com/docs/bootstrap.html#create-an-http-graphql-endpoint
(async () => {
  const app = express();
  app.use(cookieParser());
  app.post("/renew_accesstoken", async (req, res) => handleJwtRefreshTokenRequest(req, res));
  app.get("/user/confirm/:id", async (req, res) => confirmEmail(req, res));
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

// createConnection().then(async connection => {

//     console.log("Inserting a new user into the database...");
//     const user = new User();
//     user.firstName = "Timber";
//     user.lastName = "Saw";
//     user.age = 25;
//     await connection.manager.save(user);
//     console.log("Saved a new user with id: " + user.id);

//     console.log("Loading users from the database...");
//     const users = await connection.manager.find(User);
//     console.log("Loaded users: ", users);

//     console.log("Here you can setup and run express/koa/any other framework.");

// }).catch(error => console.log(error));

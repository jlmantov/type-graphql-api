import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import "reflect-metadata";
import { createConnection } from "typeorm";
import { handleJwtRefreshTokenRequest } from "./utils/auth";
import { createSchema } from "./utils/createSchema";
import { CONFIRMUSER, confirmUserEmail, resetPasswordEmail, RESETPWD } from "./utils/sendEmail";
import { verifyPasswordReset } from "./utils/verifyPasswordReset";

const corsOptions = {
  origin: `http://${process.env.DOMAIN}:${process.env.PORT}`,
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

// lambda function calling itself immediately - bootstrap - https://typegraphql.com/docs/bootstrap.html#create-an-http-graphql-endpoint
(async () => {
  const app = express();
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(bodyParser.urlencoded());
  app.use(bodyParser.json());
  app.post("/renew_accesstoken", async (req, res) => handleJwtRefreshTokenRequest(req, res));
  app.get("/user/" + CONFIRMUSER + "/:id", async (req, res, _next) => {
    // console.log("GET /user/" + CONFIRMUSER + "/ called with req.headers: ",JSON.stringify(req.headers, null, 2));
    confirmUserEmail(req, res);
  });
  app.get("/user/" + RESETPWD + "/:id", async (req, res, _next) => {
    // http://localhost:4000/user/resetpwd/5052ef22-4d6a-4d29-925a-4856148068c8
    console.log(
      "GET /user/" + RESETPWD + "/ called with req.headers: ",
      JSON.stringify(req.headers, null, 2)
    );
    resetPasswordEmail(req, res);
  });
  app.post("/user/" + RESETPWD + "/:id", async (req, res, _next) => {
    // http://localhost:4000/user/resetpwd/5052ef22-4d6a-4d29-925a-4856148068c8
    console.log("POST /user/" + RESETPWD + "/ params: ", req.params);
    console.log("POST /user/" + RESETPWD + "/ body: ", req.body);
    console.log("POST /user/" + RESETPWD + "/ headers: ", JSON.stringify(req.headers, null, 2));

    const success = await verifyPasswordReset(req, res);
    console.log();
    if (!success) {
      res.status(400).send("Attempt to reset password failed!");
    }
    // res.status(200).send("OK");
    res.status(200).redirect(`http://${process.env.DOMAIN}:${process.env.PORT}/`);
  });
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

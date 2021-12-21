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
import { CONFIRMUSER, confirmUserEmail, resetPasswordForm, RESETPWD } from "./utils/sendEmail";
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
    try {
      resetPasswordForm(req, res);
    } catch (error) {
      res.status(400).send(error.name + ": " + error.message);
    }
  });
  app.post("/user/" + RESETPWD + "/:id", async (req, res, _next) => {
    // http://localhost:4000/user/resetpwd/5052ef22-4d6a-4d29-925a-4856148068c8
    try {
      const success = await verifyPasswordReset(req, res);
      if (!success) {
        res.status(400).send("Attempt to reset password failed!");
      }
      res.clearCookie("jid"); // password changed, refreshToken is no longer valid
      res.clearCookie("roj");
      res.status(200).redirect(`http://${process.env.DOMAIN}:${process.env.PORT}/`);
    } catch (error) {
      res.clearCookie("roj");
      res.status(400).send(error.name + ": " + error.message);
    }
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

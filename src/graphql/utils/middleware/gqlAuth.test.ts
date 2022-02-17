import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import { CookieOptions } from "express";
import faker from "faker";
import jwt, { SignOptions } from "jsonwebtoken";
import request from "supertest";
import { Connection, Repository } from "typeorm";
import app from "../../../app";
import { User } from "../../../orm/entity/User";
import { UserEmail } from "../../../orm/entity/UserEmail";
import { gqlCall } from "../../../test-utils/gqlCall";
import testConn from "../../../test-utils/testConn";
import { createAccessToken, createRefreshToken } from "../../../utils/auth";
import logger from "../../../utils/middleware/winstonLogger";
import { registerMutation } from "../../modules/user/register/Register.test";
import { createSchema } from "../createSchema";
import { GraphqlContext } from "../GraphqlContext";

/**
 * Send email to user with a unique link to 'Password Reset' Form
 * called by: verifyPassword_post (User.controller.ts) - handler for endpoint /user/resetpwd/5052ef22-4d6a-4d29-925a-4856148068c8
 */
describe("gqlAuth", () => {
  let conn: Connection;
  let userRepo: Repository<User>;
  let emailRepo: Repository<UserEmail>;
  let fakeUser: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  };
  let dbuser: User | undefined;

  // init app
  let tstReq: any;
  let tstResp: any;
  let accessToken: string;
  let refreshToken: string;
  let ctx: GraphqlContext;
  const jwtAccessOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "15m",
    algorithm: "HS384",
  };

  beforeAll(async () => {
    logger.info(" --- gqlAuth.test.ts");
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    emailRepo = conn.getRepository("UserEmail");

    // init app
    const gqlServer = new ApolloServer({
      schema: await createSchema(),
      plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
      context: ({ req, res }) => ({ req, res }),
    });

    // body-parser included: https://www.apollographql.com/docs/apollo-server/v2/migration-two-dot/#simplified-usage
    // https://www.apollographql.com/docs/apollo-server/v2/migration-two-dot/#apollo-server-2-new-pattern
    await gqlServer.start();

    // add the express server as middleware to the GaphQL server
    // apollo-server-express/src/ApolloServer.ts/applyMiddleware({ app, ...rest }):
    // app.use(this.getMiddleware({ path: "/graphql"}))
    await gqlServer.applyMiddleware({ app, path: "/graphql" });

    // Every test case gets its own fakeUser
    fakeUser = {
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(8),
    };
    // Register test user
    const usr = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });
    logger.silly(" -- beforeAll -->  usr:", usr);

    // Confirm test user
    await userRepo.update(usr.data?.register.id, { confirmed: true });
    await emailRepo.delete({ email: fakeUser.email });

    // Load user
    dbuser = await userRepo.findOne({ email: fakeUser.email });
    logger.silly(" -- beforeAll -->  dbuser:", dbuser);

    // init app
    accessToken = await createAccessToken(dbuser!);
    refreshToken = await createRefreshToken(dbuser!);
    tstReq = await request(app)
      .post("/graphql")
      .set("Authorization", "bearer " + accessToken)
      .set("Cookie", `jid=${refreshToken}`);
    logger.silly(" -- beforeAll -->  Request headers", tstReq.request.header);
    // logger.silly(" -- beforeAll -->  Request headers", tstReq.request.headers);

    try {
      tstResp = await request(app)
        .post("/graphql")
        .set("Authorization", "bearer " + accessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- beforeAll -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(" -- beforeAll -->  tstResp.body", tstResp.body);

    // add dbuser to GraphqlContext
    ctx = {
      req: tstReq,
      res: {
        clearCookie: (name: string, options?: CookieOptions | undefined) => {
          logger.silly(" -- clearCookie - name=" + name + ", options:", options);
          expect(name).toEqual("jid");
          expect(options).toBeUndefined();
        },
        ...tstResp,
      },
      user: {
        id: dbuser!.id,
        tokenVersion: dbuser!.tokenVersion,
      } as User,
    }; // GraphqlContext
  });

  beforeEach(async () => {
    // mockedClearCookieCalled = false;
    tstReq = null;
    tstResp = null;
  });

  afterAll(async () => {
    if (conn && conn.isConnected) {
      await testConn.close();
    }
  });

  //
  // POST '/user/resetpwd/<Id>' - verifyPassword_post --> gqlAuth(req, res)
  //
  test("200 isAlive (works without authorization)", async () => {
    expect(dbuser).toBeDefined();
    logger.debug(" -- 200 isAlive --> dbuser", dbuser);

    // init app
    accessToken = await createAccessToken(dbuser!);
    refreshToken = await createRefreshToken(dbuser!);
    tstReq = await request(app).post("/graphql");
    // .set("Authorization", "bearer " + accessToken)
    // .set("Cookie", `jid=${refreshToken}`);
    logger.silly(" -- 200 isAlive -->  Request headers", tstReq.request.header);
    // logger.silly(" -- 200 isAlive -->  Request headers", tstReq.request.headers);

    try {
      tstResp = await request(app)
        .post("/graphql")
        // .set("Authorization", "bearer " + accessToken)
        // .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAlive }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 200 isAlive -->  query { isAlive } ERROR", error);
    }
    // logger.silly(" -- 200 isAlive -->  tstResp", tstResp.body);
    logger.silly(" -- 200 isAlive -->  Response body", tstResp.body);

    expect(tstResp.status).toBe(200);
    expect(tstResp).toHaveProperty("body");
    expect(tstResp.body).toHaveProperty("data");
    expect(tstResp.body.data).toHaveProperty("isAlive");
    expect(tstResp.body.data.isAlive).toBeGreaterThan(1644774001241);
  }); // 200 isAlive (works without authorization)

  test("200 isAuthenticated (works with authorization)", async () => {
    expect(dbuser).toBeDefined();
    logger.debug(" -- 200 isAuthenticated --> dbuser", dbuser);

    // init app
    accessToken = await createAccessToken(dbuser!);
    refreshToken = await createRefreshToken(dbuser!);
    tstReq = await request(app)
      .post("/graphql")
      .set("Authorization", "bearer " + accessToken)
      .set("Cookie", `jid=${refreshToken}`);
    // logger.silly(" -- 200 isAuthenticated -->  tstReq.request.header", tstReq.request.header);

    ctx.req.headers = {
      authorization: tstReq.request.header.Authorization,
      cookie: tstReq.request.header.Cookie,
      ...tstReq.headers,
    };
    logger.silly(" -- 200 isAuthenticated -->  ctx.req.headers", ctx.req.headers);

    // Require autentication
    try {
      tstResp = await request(app)
        .post("/graphql")
        .set("Authorization", "bearer " + accessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 200 isAuthenticated -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(` -- 200 isAuthenticated -->  tstResp.status: ${tstResp.status}`);
    logger.silly(" -- 200 isAuthenticated -->  tstResp.body", tstResp.body);

    expect(tstResp.status).toBe(200);
    expect(tstResp).toHaveProperty("body");
    expect(tstResp.body).toHaveProperty("data");
    expect(tstResp.body.data).toHaveProperty("isAuthenticated");
    expect(tstResp.body.data.isAuthenticated).toEqual(`userId ${dbuser?.id} is authenticated!`);
  }); // 200 isAuthenticated (works with authorization)

  test("401 No authorization header", async () => {
    expect(dbuser).toBeDefined();
    logger.debug(" -- 401 No authorization --> dbuser", dbuser);

    tstReq = await request(app)
      .post("/graphql")
      // .set("Authorization", "bearer " + accessToken)
      .set("Cookie", `jid=${refreshToken}`);
    // logger.silly(" -- 401 No authorization header -->  tstReq.request.header", tstReq.request.header);

    ctx.req.headers = {
      // authorization: tstReq.request.header.Authorization,
      cookie: tstReq.request.header.Cookie,
      ...tstReq.headers,
    };
    logger.silly(" -- 401 No authorization header -->  ctx.req.headers", ctx.req.headers);

    // Require autentication
    try {
      tstResp = await request(app)
        .post("/graphql")
        // .set("Authorization", "bearer " + accessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 401 No authorization header -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(` -- 401 No authorization header -->  tstResp.status: ${tstResp.status}`);
    logger.silly(" -- 401 No authorization header -->  tstResp.body", tstResp.body);

    // Question: Why status 200 when REST returns 401 ??
    // Answer: GraphQL supports partial failures - https://www.apollographql.com/docs/react/data/error-handling/
    // If resolver errors occur, your server can still return partial data. (from multiple data sources)
    expect(tstResp.status).toBe(200);
    expect(tstResp.body).toHaveProperty("errors");
    expect(tstResp.body.errors[0].extensions).toHaveProperty("code");
    expect(tstResp.body.errors[0].extensions.code).toEqual("UNAUTHENTICATED");
    expect(tstResp.body.errors[0]).toHaveProperty("message");
    expect(tstResp.body.errors[0].message).toEqual("Expired or invalid input");
  }); // 401 No authorization header

  test("401 Invalid accessToken", async () => {
    expect(dbuser).toBeDefined();
    logger.debug(" -- 401 Invalid accessToken --> dbuser", dbuser);
    const invalidPayload = { bit: dbuser?.id, xqt: Number(dbuser?.tokenVersion) }; // 'xqt' should have been 'ogj'
    const invalidAccessToken = await jwt.sign(
      invalidPayload,
      process.env.JWT_ACCESS_TOKEN_SECRET!,
      jwtAccessOptions
    );
    logger.silly(" -- 401 Invalid accessToken --> payload: ", invalidPayload);

    tstReq = await request(app)
      .post("/graphql")
      .set("Authorization", "bearer " + invalidAccessToken)
      .set("Cookie", `jid=${refreshToken}`);
    // logger.silly(" -- 401 Invalid accessToken -->  tstReq.request.header", tstReq.request.header);

    ctx.req.headers = {
      authorization: tstReq.request.header.Authorization,
      cookie: tstReq.request.header.Cookie,
      ...tstReq.headers,
    };
    logger.silly(" -- 401 Invalid accessToken -->  ctx.req.headers", ctx.req.headers);

    // Require autentication
    try {
      tstResp = await request(app)
        .post("/graphql")
        .set("Authorization", "bearer " + invalidAccessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 401 Invalid accessToken -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(` -- 401 Invalid accessToken -->  tstResp.status: ${tstResp.status}`);
    logger.silly(" -- 401 Invalid accessToken -->  tstResp.body", tstResp.body);

    expect(tstResp).toHaveProperty("request");
    expect(tstResp.request).toHaveProperty("header");
    expect(tstResp.request.header).toHaveProperty("Authorization");
    logger.silly(
      " -- 401 Invalid accessToken --> Authorization: " + tstResp.request.header.Authorization
    );

    expect(tstResp).toHaveProperty("error");
    logger.silly(" -- 401 Invalid accessToken --> tstResp.error", { error: tstResp.error });

    // Question: Why status 200 when REST returns 401 ??
    // Answer: GraphQL supports partial failures - https://www.apollographql.com/docs/react/data/error-handling/
    // If resolver errors occur, your server can still return partial data. (from multiple data sources)
    expect(tstResp.status).toBe(200);
    expect(tstResp.body).toHaveProperty("errors");
    expect(tstResp.body.errors[0].extensions).toHaveProperty("code");
    expect(tstResp.body.errors[0].extensions.code).toEqual("UNAUTHENTICATED");
    expect(tstResp.body.errors[0]).toHaveProperty("message");
    expect(tstResp.body.errors[0].message).toEqual("Expired or invalid input");
  }); // 401 Invalid accessToken

  //
  //

  test("401 Wrong jwt secret", async () => {
    expect(dbuser).toBeDefined();
    logger.debug(" -- 401 Wrong jwt secret --> dbuser", dbuser);

    const accessPayload = { bit: dbuser?.id, ogj: Number(dbuser?.tokenVersion) };
    const wrongSecretAccessToken = await jwt.sign(
      accessPayload,
      "13EANPG0P9a6slPkutW8goHBZIsekwpV",
      jwtAccessOptions
    );
    logger.silly(" -- 401 Wrong jwt secret --> token payload", accessPayload);

    tstReq = await request(app)
      .post("/graphql")
      .set("Authorization", "bearer " + wrongSecretAccessToken)
      .set("Cookie", `jid=${refreshToken}`);
    // logger.silly(" -- 401 Wrong jwt secret -->  tstReq.request.header", tstReq.request.header);

    ctx.req.headers = {
      authorization: tstReq.request.header.Authorization,
      cookie: tstReq.request.header.Cookie,
      ...tstReq.headers,
    };
    logger.silly(" -- 401 Wrong jwt secret -->  ctx.req.headers", ctx.req.headers);

    // Require autentication
    try {
      tstResp = await request(app)
        .post("/graphql")
        .set("Authorization", "bearer " + wrongSecretAccessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 401 Wrong jwt secret -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(` -- 401 Wrong jwt secret -->  tstResp.status: ${tstResp.status}`);
    logger.silly(" -- 401 Wrong jwt secret -->  tstResp.body", tstResp.body);

    expect(tstResp).toHaveProperty("request");
    expect(tstResp.request).toHaveProperty("header");
    expect(tstResp.request.header).toHaveProperty("Authorization");
    logger.silly(
      " -- 401 Wrong jwt secret --> Authorization: " + tstResp.request.header.Authorization
    );

    expect(tstResp).toHaveProperty("error");
    logger.silly(" -- 401 Wrong jwt secret --> tstResp.error", { error: tstResp.error });

    // Question: Why status 200 when REST returns 401 ??
    // Answer: GraphQL supports partial failures - https://www.apollographql.com/docs/react/data/error-handling/
    // If resolver errors occur, your server can still return partial data. (from multiple data sources)
    expect(tstResp.status).toBe(200);
    expect(tstResp.body).toHaveProperty("errors");
    expect(tstResp.body.errors[0].extensions).toHaveProperty("code");
    expect(tstResp.body.errors[0].extensions.code).toEqual("UNAUTHENTICATED");
    expect(tstResp.body.errors[0]).toHaveProperty("message");
    expect(tstResp.body.errors[0].message).toEqual("Expired or invalid input");
  }); // 401 Wrong jwt secret

  //
  //

  test("403 Wrong tokenVersion", async () => {
    expect(dbuser).toBeDefined();
    await userRepo.update(dbuser!.id, { tokenVersion: 7 });
    dbuser = await userRepo.findOne(dbuser!.id);
    logger.debug(" -- 403 Wrong tokenVersion --> dbuser", dbuser);

    const wrongVersionPayload = { bit: dbuser?.id, ogj: Number(dbuser?.tokenVersion) - 1 };
    const wrongVersionAccessToken = await jwt.sign(
      wrongVersionPayload,
      process.env.JWT_ACCESS_TOKEN_SECRET!,
      jwtAccessOptions
    );
    logger.silly(" -- 403 Wrong tokenVersion --> token payload", wrongVersionPayload);

    tstReq = await request(app)
      .post("/graphql")
      .set("Authorization", "bearer " + wrongVersionAccessToken)
      .set("Cookie", `jid=${refreshToken}`);
    // logger.silly(" -- 403 Wrong tokenVersion -->  tstReq.request.header", tstReq.request.header);

    ctx.req.headers = {
      authorization: tstReq.request.header.Authorization,
      cookie: tstReq.request.header.Cookie,
      ...tstReq.headers,
    };
    logger.silly(" -- 403 Wrong tokenVersion -->  ctx.req.headers", ctx.req.headers);

    // Require autentication
    try {
      tstResp = await request(app)
        .post("/graphql")
        .set("Authorization", "bearer " + wrongVersionAccessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 403 Wrong tokenVersion -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(` -- 403 Wrong tokenVersion -->  tstResp.status: ${tstResp.status}`);
    logger.silly(" -- 403 Wrong tokenVersion -->  tstResp.body", tstResp.body);

    expect(tstResp).toHaveProperty("request");
    expect(tstResp.request).toHaveProperty("header");
    expect(tstResp.request.header).toHaveProperty("Authorization");
    logger.silly(
      " -- 403 Wrong tokenVersion --> Authorization: " + tstResp.request.header.Authorization
    );

    expect(tstResp).toHaveProperty("error");
    logger.silly(" -- 403 Wrong tokenVersion --> tstResp.error", { error: tstResp.error });

    // Question: Why status 200 when REST returns 403 ??
    // Answer: GraphQL supports partial failures - https://www.apollographql.com/docs/react/data/error-handling/
    // If resolver errors occur, your server can still return partial data. (from multiple data sources)
    expect(tstResp.status).toBe(200);
    expect(tstResp.body).toHaveProperty("errors");
    expect(tstResp.body.errors[0]).toHaveProperty("extensions");
    expect(tstResp.body.errors[0].extensions).toHaveProperty("code");
    expect(tstResp.body.errors[0].extensions.code).toEqual("FORBIDDEN");
    expect(tstResp.body.errors[0]).toHaveProperty("message");
    expect(tstResp.body.errors[0].message).toEqual("Access expired, please login again");
  }); // 403 Wrong tokenVersion

  //
  //

  test("403 Access expired, please login again", async () => {
    expect(dbuser).toBeDefined();
    logger.debug(" -- 403 Access expired --> dbuser", dbuser);
    const accessPayload = { bit: dbuser?.id, ogj: Number(dbuser?.tokenVersion) };
    logger.silly(" -- 403 Access expired --> token payload", accessPayload);

    const expiredAccessOptions: SignOptions = {
      header: { alg: "HS384", typ: "JWT" },
      expiresIn: "-1h",
      algorithm: "HS384",
    };
    const expiredAccessToken = await jwt.sign(
      accessPayload,
      process.env.JWT_ACCESS_TOKEN_SECRET!,
      expiredAccessOptions
    );

    tstReq = await request(app)
      .post("/graphql")
      .set("Authorization", "bearer " + expiredAccessToken)
      .set("Cookie", `jid=${refreshToken}`);
    // logger.silly(" -- 403 Access expired -->  tstReq.request.header", tstReq.request.header);

    ctx.req.headers = {
      authorization: tstReq.request.header.Authorization,
      cookie: tstReq.request.header.Cookie,
      ...tstReq.headers,
    };
    logger.silly(" -- 403 Access expired -->  ctx.req.headers", ctx.req.headers);

    // Require autentication
    try {
      tstResp = await request(app)
        .post("/graphql")
        .set("Authorization", "bearer " + expiredAccessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 403 Access expired -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(` -- 403 Access expired -->  tstResp.status: ${tstResp.status}`);
    logger.silly(" -- 403 Access expired -->  tstResp.body", tstResp.body);

    expect(tstResp).toHaveProperty("request");
    expect(tstResp.request).toHaveProperty("header");
    expect(tstResp.request.header).toHaveProperty("Authorization");
    logger.silly(
      " -- 403 Access expired --> Authorization: " + tstResp.request.header.Authorization
    );

    expect(tstResp).toHaveProperty("error");
    logger.silly(" -- 403 Access expired --> tstResp.error", { error: tstResp.error });

    // Question: Why status 200 when REST returns 403 ??
    // Answer: GraphQL supports partial failures - https://www.apollographql.com/docs/react/data/error-handling/
    // If resolver errors occur, your server can still return partial data. (from multiple data sources)
    expect(tstResp.status).toBe(200);
    expect(tstResp.body).toHaveProperty("errors");
    expect(tstResp.body.errors[0]).toHaveProperty("extensions");
    expect(tstResp.body.errors[0].extensions).toHaveProperty("code");
    expect(tstResp.body.errors[0].extensions.code).toEqual("FORBIDDEN");
    expect(tstResp.body.errors[0]).toHaveProperty("message");
    expect(tstResp.body.errors[0].message).toEqual("Access expired, please login again");
  }); // 403 Access expired, please login again

  //
  //

  test("500 User ID not found", async () => {
    expect(dbuser).toBeDefined();
    logger.debug(" -- 500 User ID not found --> dbuser", dbuser);

    const invalidUserPayload = { bit: 789, ogj: Number(dbuser?.tokenVersion) };
    const invalidUserAccessToken = await jwt.sign(
      invalidUserPayload,
      process.env.JWT_ACCESS_TOKEN_SECRET!,
      jwtAccessOptions
    );
    logger.silly(" -- 500 User ID not found --> token payload", invalidUserPayload);

    tstReq = await request(app)
      .post("/graphql")
      .set("Authorization", "bearer " + invalidUserAccessToken)
      .set("Cookie", `jid=${refreshToken}`);
    // logger.silly(" -- 500 User ID not found -->  tstReq.request.header", tstReq.request.header);

    ctx.req.headers = {
      authorization: tstReq.request.header.Authorization,
      cookie: tstReq.request.header.Cookie,
      ...tstReq.headers,
    };
    logger.silly(" -- 500 User ID not found -->  ctx.req.headers", ctx.req.headers);

    // Require autentication
    try {
      tstResp = await request(app)
        .post("/graphql")
        .set("Authorization", "bearer " + invalidUserAccessToken)
        .set("Cookie", `jid=${refreshToken}`)
        .send({ query: "query { isAuthenticated }" }); // req.body.query
    } catch (error) {
      logger.silly(" -- 500 User ID not found -->  query { isAuthenticated } ERROR", error);
    }
    logger.silly(` -- 500 User ID not found -->  tstResp.status: ${tstResp.status}`);
    logger.silly(" -- 500 User ID not found -->  tstResp.body", tstResp.body);

    expect(tstResp).toHaveProperty("request");
    expect(tstResp.request).toHaveProperty("header");
    expect(tstResp.request.header).toHaveProperty("Authorization");
    logger.silly(
      " -- 500 User ID not found --> Authorization: " + tstResp.request.header.Authorization
    );

    expect(tstResp).toHaveProperty("error");
    logger.silly(" -- 500 User ID not found --> tstResp.error", { error: tstResp.error });

    // Question: Why status 200 when REST returns 500 ??
    // Answer: GraphQL supports partial failures - https://www.apollographql.com/docs/react/data/error-handling/
    // If resolver errors occur, your server can still return partial data. (from multiple data sources)
    expect(tstResp.status).toBe(200);
    expect(tstResp.body).toHaveProperty("errors");
    expect(tstResp.body.errors[0]).toHaveProperty("extensions");
    expect(tstResp.body.errors[0].extensions).toHaveProperty("code");
    expect(tstResp.body.errors[0].extensions.code).toEqual("INTERNAL_SERVER_ERROR");
    expect(tstResp.body.errors[0]).toHaveProperty("message");
    expect(tstResp.body.errors[0].message).toEqual("Something went wrong");
  }); // 500 User ID not found
}); // gqlAuth

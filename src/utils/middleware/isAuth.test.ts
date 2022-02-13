import faker from "faker";
import jwt, { SignOptions } from "jsonwebtoken";
import request from "supertest";
import { Connection, Repository } from "typeorm";
import app from "../../app";
import { registerMutation } from "../../graphql/modules/user/register/Register.test";
import { User } from "../../orm/entity/User";
import { UserEmail } from "../../orm/entity/UserEmail";
import { gqlCall } from "../../test-utils/gqlCall";
import testConn from "../../test-utils/testConn";
import { createAccessToken } from "../auth";
import { isAuth } from "./isAuth";
import logger from "./winstonLogger";

/**
 * Send email to user with a unique link to 'Password Reset' Form
 * called by: verifyPassword_post (User.controller.ts) - handler for endpoint /user/resetpwd/5052ef22-4d6a-4d29-925a-4856148068c8
 */
describe("isAuth", () => {
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
  const accessOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "15m",
    algorithm: "HS384",
  };
  const expiredAccessOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "-1h",
    algorithm: "HS384",
  };

  beforeAll(async () => {
    logger.info(" --- isAuth.test.ts");
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    emailRepo = conn.getRepository("UserEmail");

    // init app
    app.use(isAuth); // <<<< subject of test
  });

  afterAll(async () => {
    if (conn && conn.isConnected) {
      await testConn.close();
    }
  });

  beforeEach(async () => {
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
    logger.silly(" -- beforeEach -->  usr:", usr);

    // Confirm test user
    await userRepo.update(usr.data?.register.id, { confirmed: true });
    await emailRepo.delete({ email: fakeUser.email });

    // Load user
    dbuser = await userRepo.findOne({ email: fakeUser.email });
  });

  //
  // POST '/user/resetpwd/<Id>' - verifyPassword_post --> isAuth(req, res)
  //
  describe("isAuth", () => {
    test("401 No authorization header", async () => {
      expect(dbuser).toBeDefined();
      logger.debug(" -- 401 No authorization --> dbuser", dbuser);

      const tstReq: any = await request(app).get("/user/1");
      expect(tstReq).toHaveProperty("request");
      expect(tstReq.request).toHaveProperty("header");
      logger.silly(" -- 401 No authorization header --> Request headers: " + tstReq.request.header);

      const tstResp = await request(app).get("/user/1").send();
      logger.silly(" -- 401 No authorization header --> tstResp", tstResp.body);

      expect(tstResp.status).toBe(401);
      expect(tstResp.text).toEqual("Expired or invalid input");
    }); // 401 No authorization header

    test("401 Invalid accessToken", async () => {
      expect(dbuser).toBeDefined();
      logger.debug(" -- 401 Invalid accessToken --> dbuser", dbuser);
      const invalidPayload = { bit: dbuser?.id, xqt: Number(dbuser?.tokenVersion) }; // 'xqt' should have been 'ogj'
      const invalidAccessToken = await jwt.sign(
        invalidPayload,
        process.env.JWT_ACCESS_TOKEN_SECRET!,
        accessOptions
      );
      logger.silly(" -- 401 Invalid accessToken --> payload: ", invalidPayload);

      const tstResp: any = await request(app)
        .get("/user/1")
        .set("Authorization", "bearer " + invalidAccessToken)
        .send();

      expect(tstResp).toHaveProperty("request");
      expect(tstResp.request).toHaveProperty("header");
      expect(tstResp.request.header).toHaveProperty("Authorization");
      logger.silly(
        " -- 401 Invalid accessToken --> Authorization: " + tstResp.request.header.Authorization
      );

      expect(tstResp).toHaveProperty("error");
      logger.silly(" -- 401 Invalid accessToken --> tstResp.error", tstResp.error);

      expect(tstResp.status).toBe(401);
      expect(tstResp.text).toEqual("Expired or invalid input");
    }); // 401 Invalid accessToken

    test("403 Wrong tokenVersion", async () => {
      expect(dbuser).toBeDefined();
      await userRepo.update(dbuser!.id, { tokenVersion: 7 });
      dbuser = await userRepo.findOne(dbuser!.id);
      logger.debug(" -- 403 Wrong tokenVersion --> dbuser", dbuser);

      const wrongVersionPayload = { bit: dbuser?.id, ogj: Number(dbuser?.tokenVersion) - 1 };
      const wrongVersionAccessToken = await jwt.sign(
        wrongVersionPayload,
        process.env.JWT_ACCESS_TOKEN_SECRET!,
        accessOptions
      );
      logger.silly(" -- 403 Wrong tokenVersion --> token payload", wrongVersionPayload);

      const tstResp: any = await request(app)
        .get("/user/1")
        .set("Authorization", "bearer " + wrongVersionAccessToken)
        .send();

      expect(tstResp).toHaveProperty("request");
      expect(tstResp.request).toHaveProperty("header");
      expect(tstResp.request.header).toHaveProperty("Authorization");
      logger.silly(
        " -- 403 Wrong tokenVersion --> Authorization: " + tstResp.request.header.Authorization
      );

      expect(tstResp).toHaveProperty("error");
      logger.silly(" -- 403 Wrong tokenVersion --> tstResp.error", tstResp.error);

      logger.silly(" -- 403 Wrong tokenVersion --> tstResp", {
        status: tstResp.status,
        text: tstResp.text,
      });
      expect(tstResp.status).toBe(403);
      expect(tstResp.text).toEqual("Access expired, please login again");
    }); // 403 Wrong tokenVersion

    test("401 Wrong jwt secret", async () => {
      expect(dbuser).toBeDefined();
      logger.debug(" -- 401 Wrong jwt secret --> dbuser", dbuser);

      const accessPayload = { bit: dbuser?.id, ogj: Number(dbuser?.tokenVersion) };
      const wrongSecretAccessToken = await jwt.sign(
        accessPayload,
        "13EANPG0P9a6slPkutW8goHBZIsekwpV",
        accessOptions
      );
      logger.silly(" -- 401 Wrong jwt secret --> token payload", accessPayload);

      const tstResp: any = await request(app)
        .get("/user/1")
        .set("Authorization", "bearer " + wrongSecretAccessToken)
        .send();

      expect(tstResp).toHaveProperty("request");
      expect(tstResp.request).toHaveProperty("header");
      expect(tstResp.request.header).toHaveProperty("Authorization");
      logger.silly(
        " -- 401 Wrong jwt secret --> Authorization: " + tstResp.request.header.Authorization
      );

      expect(tstResp).toHaveProperty("error");
      logger.silly(" -- 401 Wrong jwt secret --> tstResp.error", tstResp.error);

      logger.silly(" -- 401 Wrong jwt secret --> tstResp", {
        status: tstResp.status,
        text: tstResp.text,
      });
      expect(tstResp.status).toBe(401);
      expect(tstResp.text).toEqual("Expired or invalid input");
    }); // 401 Wrong jwt secret

    test("403 Access expired, please login again", async () => {
      expect(dbuser).toBeDefined();
      logger.debug(" -- 403 Access expired --> dbuser", dbuser);
      const accessPayload = { bit: dbuser?.id, ogj: Number(dbuser?.tokenVersion) };
      logger.silly(" -- 403 Access expired --> token payload", accessPayload);

      const expiredAccessToken = await jwt.sign(
        accessPayload,
        process.env.JWT_ACCESS_TOKEN_SECRET!,
        expiredAccessOptions
      );
      const tstResp: any = await request(app)
        .get("/user/1")
        .set("Authorization", "bearer " + expiredAccessToken)
        .send();

      expect(tstResp).toHaveProperty("request");
      expect(tstResp.request).toHaveProperty("header");
      expect(tstResp.request.header).toHaveProperty("Authorization");
      logger.silly(
        " -- 403 Access expired --> Authorization: " + tstResp.request.header.Authorization
      );

      expect(tstResp).toHaveProperty("error");
      logger.silly(" -- 403 Access expired --> tstResp", tstResp.error);

      expect(tstResp.status).toBe(403);
      expect(tstResp.text).toEqual("Access expired, please login again");
    }); // 403 Access expired, please login again

    test("500 User ID not found", async () => {
      expect(dbuser).toBeDefined();
      logger.debug(" -- 500 User ID not found --> dbuser", dbuser);

      const invalidUserPayload = { bit: 789, ogj: Number(dbuser?.tokenVersion) };
      const invalidUserAccessToken = await jwt.sign(
        invalidUserPayload,
        process.env.JWT_ACCESS_TOKEN_SECRET!,
        accessOptions
      );
      logger.silly(" -- 500 User ID not found --> token payload", invalidUserPayload);

      const tstResp: any = await request(app)
        .get("/user/1")
        .set("Authorization", "bearer " + invalidUserAccessToken)
        .send();

      logger.silly(" -- 500 User ID not found --> tstResp.request.headers", tstResp.request.header);

      expect(tstResp).toHaveProperty("request");
      expect(tstResp.request).toHaveProperty("header");
      expect(tstResp.request.header).toHaveProperty("Authorization");
      logger.silly(
        " -- 500 User ID not found --> Authorization: " + tstResp.request.header.Authorization
      );

      expect(tstResp).toHaveProperty("error");
      logger.debug(" -- 500 User ID not found --> tstResp", tstResp.error);

      logger.silly(" -- 500 User ID not found --> tstResp", {
        status: tstResp.status,
        text: tstResp.text,
      });
      expect(tstResp.status).toBe(500);
      expect(tstResp.text).toEqual("Something went wrong");
    }); // 500 User ID not found

    test("200 Success", async () => {
      expect(dbuser).toBeDefined();
      logger.debug(" -- 200 Success --> dbuser", dbuser);
      const accessToken = await createAccessToken(dbuser!);
      logger.silly(" -- 200 Success --> accessToken: " + accessToken);

      const tstReq: any = await request(app)
        .get("/user/1")
        .set("Authorization", "bearer " + accessToken);

      expect(tstReq).toHaveProperty("request");
      expect(tstReq.request).toHaveProperty("header");
      expect(tstReq.request.header).toHaveProperty("Authorization");
      logger.silly(" -- 200 Success --> Authorization: " + tstReq.request.header.Authorization);

      const tstResp: any = await request(app)
        .get("/user/1")
        .set("Authorization", "bearer " + accessToken)
        .send();

      expect(tstResp.status).toBe(200);
      expect(tstResp.request.header.Authorization.split(" ")[0]).toEqual("bearer");
      expect(tstResp.request.header.Authorization.split(" ")[1].length).toBeGreaterThan(150); // ~170-176

      expect(tstResp).toHaveProperty("body");
      expect(tstResp.body).toHaveProperty("users");
      logger.silly(" -- 200 Success --> tstResp.body", tstResp.body);
    }); // 200 Success
  }); // isAuth
});

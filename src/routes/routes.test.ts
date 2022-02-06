import faker from "faker";
import request from "supertest";
import { Connection, Repository } from "typeorm";
import app from "../app";
import { registerMutation } from "../graphql/modules/user/register/Register.test";
import { User } from "../orm/entity/User";
import { gqlCall } from "../test-utils/gqlCall";
import testConn from "../test-utils/testConn";
import { createRefreshToken } from "../utils/auth";
import logger from "../utils/middleware/winstonLogger";

/**
 * inpired by Sam Meech-Ward - Testing Node Server with Jest and Supertest
 * https://www.youtube.com/watch?v=FKnzS_icp20
 *
 * Supertest request: https://github.com/visionmedia/supertest#readme
 * Express GET : https://expressjs.com/en/4x/api.html#app.get.method
 * Express POST: https://expressjs.com/en/4x/api.html#app.post.method
 *
 * src/index.ts endpoints:
 * GET  "/" - landing page
 * POST "/renew_accesstoken" - requires cookie with refreshToken.
 */
describe("Main routes - Landingpage + Renew Access token", () => {
  let conn: Connection;
  let userRepo: Repository<User>;
  let user: User;

  beforeAll(async () => {
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    logger.info(" --- routes.test.ts DB: " + conn.driver.database);

    const fakeUser = {
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(8),
    };
    const result = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });
    if (!!result.data && result.data.register) {
      user = result.data.register;
      await userRepo.increment({ id: user.id }, "confirmed", 1); // allow user to login
      user.confirmed = true;
      user.tokenVersion = 0; // used by '/renew_accesstoken'
    }
  });

  afterAll(async () => {
    conn.isConnected && (await conn.close());
  });

  test("GET / - should return a simple 'hello' string", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
    // logger.debug("response", JSON.stringify(response.text));
    expect(response.text).toEqual("hello");
  });

  describe("POST /renew_accesstoken - requires cookie with refreshToken", () => {
    test("should fail on cookie missing", async () => {
      const res = await request(app).post("/renew_accesstoken").send(); // no cookie
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual("Access denied!");
    }); // test: fail on cookie missing

    test("should fail on refreshToken expired!", async () => {
      // old token - should fail with response message and cookie deleted in response
      const oldRefreshToken =
        "eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJrZXciOjEsInRhcyI6MCwiaWF0IjoxNjQwNjg4MjYwLCJleHAiOjE2NDEyOTMwNjB9.ZUC-qxsuegFr9XVAkAWQKrdMIF3UasxwoLlur5w-2AdKT2F1UwAQPI-jP6ASMPOr";

      const res = await request(app)
        .post("/renew_accesstoken")
        .set("Cookie", `jid=${oldRefreshToken}`)
        .send(); // cookie is required, nothing else
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual("jwt expired");
    }); // test: fail on refreshToken expired

    test("should succeed on valid payload in cookie", async () => {
      // 1. create  refreshToken
      expect(user).toBeDefined();
      const refreshToken = await createRefreshToken(user);

      // 2. add token to request in a cookie
      const res = await request(app)
        .post("/renew_accesstoken")
        .set("Cookie", `jid=${refreshToken}`)
        .send();

      // 3. validate success response
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).not.toHaveProperty("error");
    }); // test: succeed on valid payload

    test("should fail on invalid payload in cookie", async () => {
      // 1. create an invalid refreshToken - use valid userId + invalid tokenVersion
      expect(user).toBeDefined();

      // invalidate tokenVersion in payload by incrementing tokenVersion in DB
      const result = await userRepo.increment({ id: user.id }, "tokenVersion", 1);
      expect(result.affected).toBe(1);

      const refreshToken = await createRefreshToken(user);
      // 2. add token to request in a cookie
      const res = await request(app)
        .post("/renew_accesstoken")
        .set("Cookie", `jid=${refreshToken}`)
        .send();
      // 3. validate error response
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual("refreshToken expired, please login again!");
    }); // test: fail on invalid payload
  }); // POST /renew_accesstoken
});

import faker from "faker";
import request from "supertest";
import { Connection, Repository } from "typeorm";
import { CONFIRMUSER } from ".";
import app from "../../app";
import { registerMutation } from "../../graphql/modules/user/register/Register.test";
import { User } from "../../orm/entity/User";
import { UserEmail } from "../../orm/entity/UserEmail";
import { gqlCall } from "../../test-utils/gqlCall";
import testConn from "../../test-utils/testConn";
import { createAccessToken } from "../../utils/auth";
import logger from "../../utils/middleware/winstonLogger";

/**
 * inpired by Sam Meech-Ward - Testing Node Server with Jest and Supertest
 * https://www.youtube.com/watch?v=FKnzS_icp20
 *
 * Supertest readme: https://github.com/visionmedia/supertest#readme
 * Express GET : https://expressjs.com/en/4x/api.html#app.get.method
 * Express POST: https://expressjs.com/en/4x/api.html#app.post.method
 *
 * src/user/index.ts endpoints:
 * GET  "/user/" (list of users) - requires JWT accessToken
 * GET  "/user/confirm/:id" - activated from email
 * GET  "/user/resetpwd/:id" - activated from email, public access
 * POST "/user/resetpwd/:id" - activated from newPasswordForm_get
 */
describe("User", () => {
  let conn: Connection;
  let userRepo: Repository<User>;
  let emailRepo: Repository<UserEmail>;
  let user: User;

  beforeAll(async () => {
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    emailRepo = conn.getRepository("UserEmail");
    logger.info(" --- user.test.ts DB: " + conn.driver.database);

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
      user.confirmed = false;
      user.tokenVersion = 0; // used by '/renew_accesstoken'
    }
  });

  afterAll(async () => {
    conn.isConnected && (await conn.close());
  });

  describe("GET /user/", () => {
    test("should fail on missing authentication header", async () => {
      const res = await request(app).get("/user").send(); // no authentication header

      expect(res.statusCode).toEqual(401);
      expect(res.text).toEqual("Not authenticated");
    }); // test: fail on missing authentication header

    test("should fail on authentication header with expired accessToken", async () => {
      // expired access token
      const accessToken =
        "eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJiaXQiOjE3LCJvZ2oiOjQ3LCJpYXQiOjE2NDAxNzkyOTcsImV4cCI6MTY0MDE4MDE5N30.blYGmrKt4XSPL_mScmig31tocV30tLExGbUNrTCTByIm5AP7vtK8if0-dsH1JPln";

      const res = await request(app)
        .get("/user")
        .set("Authorization", "bearer " + accessToken)
        .send(); // no authentication header

      expect(res.statusCode).toEqual(403);
      expect(res.text).toEqual("Access expired, please login again");
    }); // test: fail on expired accessToken

    test("should succeed on authentication header with valid accessToken", async () => {
      // 1. create an new refreshToken - use valid userId/tokenVersion
      expect(user).toBeDefined();
      const accessToken = await createAccessToken(user);

      const res = await request(app)
        .get("/user")
        .set("Authorization", "bearer " + accessToken)
        .send(); // no authentication header

      expect(res.statusCode).toEqual(200);
      // response:  {
      //   users: [
      //     {
      //       id: 1,
      //       firstName: 'John',
      //       lastName: 'Doe',
      //       email: 'john.doe@mail.com',
      //       password: 'BSIwn+mHrELgSdIhOktI1g$OsSHA1C7nffXe69/Omswog4GpwcNGX0sijRQwdiW8HQ',
      //       confirmed: false,
      //       tokenVersion: 3
      //     },
      //     :
      //   ]
      expect(res.body).toHaveProperty("users");
      expect(res.body.users.length).toBeGreaterThan(1);
    }); // test: authentication header with valid accessToken
  }); // GET /user/

  /**
   * src/graphql/modules/user/Register.test.ts:
   * 1. When user is registered, an email is sent
   * 2. If provided email is already in use, registration is rejected
   * Test suite below:
   * 3. Before user activates email-link, login is disabled
   * 4. When user activates email-link, login is enabled
   * 5. When user activates email-link, email-link is removed
   * 6. When user activates email-link, user client is redirected to landing page
   */
  describe("Register user, Email confirmation - GET /user/confirm/:id", () => {
    let userEmail: UserEmail | undefined;

    beforeAll(async () => {
      userEmail = await emailRepo.findOne({
        where: { email: user.email },
      });
    });

    test("Before user activates email-link, login is disabled", async () => {
      expect(user).toBeDefined();
      expect(userEmail).toBeDefined();
      expect(user!.confirmed).toBe(false);
    }); // test: login disabled

    test("should succeed when user activates email-link", async () => {
      expect(user).toBeDefined();
      expect(user!.confirmed).toBe(false);
      expect(userEmail).toBeDefined();

      const res = await request(app)
        .get("/user/confirm/" + userEmail!.uuid)
        .send(); // no authentication header

      // 4. When user activates email-link, login is enabled
      const userActive = await userRepo.findOne({ id: user!.id });
      expect(userActive).toBeDefined();
      expect(userActive!.confirmed).toBe(true);

      // 5. When user activates email-link, email-link is removed
      const userEmailActive = await emailRepo.findOne({
        where: {
          email: user!.email,
          reason: CONFIRMUSER,
        },
      });
      expect(userEmailActive).not.toBeDefined();

      // 6. When user activates email-link, user client is redirected to landing page
      expect(res.statusCode).toEqual(302);
      expect(res.text).toEqual("Found. Redirecting to http://localhost:4000/");
    }); // test: user activates email-link

    test("should fail when user attempts to use email-link second time", async () => {
      expect(user).toBeDefined();
      expect(userEmail).toBeDefined();

      const res = await request(app)
        .get("/user/confirm/" + userEmail!.uuid)
        .send();

      // logger.debug("use email-link second time:", JSON.stringify(res, null, 2));
      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual("Expired or unknown id, please register again");
    }); // test: fail on attempt to use email-link second time
  }); // Register user, Email confirmation

  // describe("GET /user/resetpwd/:id", () => {
  //   test("should succeed on ...", async () => {
  //     //  TO DO
  //   });

  //   test("should fail on ...", async () => {
  //     //  TO DO
  //   });
  // });

  // describe("POST /user/resetpwd/:id", () => {
  //   test("should succeed on ...", async () => {
  //     //  TO DO
  //   });

  //   test("should fail on ...", async () => {
  //     //  TO DO
  //   });
  // });
});

import request from "supertest";
import { Connection } from "typeorm";
import app from "../../app";
import { User } from "../../orm/entity/User";
import { testConn } from "../../test-utils/testConn";
import { createAccessToken } from "../../utils/auth";

let conn: Connection;

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
  beforeAll(async () => {
    conn = await testConn();
  });

  afterAll(async () => {
    await conn.close();
  });

  describe("GET /user/", () => {
    test("should fail on missing authentication header", async () => {
      const res = await request(app).get("/user").send(); // no authentication header
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual("Access denied!");
    });

    test("should fail on authentication header with expired accessToken", async () => {
      // expired access token
      const accessToken =
        "eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJiaXQiOjE3LCJvZ2oiOjQ3LCJpYXQiOjE2NDAxNzkyOTcsImV4cCI6MTY0MDE4MDE5N30.blYGmrKt4XSPL_mScmig31tocV30tLExGbUNrTCTByIm5AP7vtK8if0-dsH1JPln";

      const res = await request(app)
        .get("/user")
        .set("Authorization", "bearer " + accessToken)
        .send(); // no authentication header
      // console.log("response: ", JSON.stringify(res, null, 2));

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual("Access denied!");
    });

    test("should succeed on authentication header with valid accessToken", async () => {
      // 1. create an invalid refreshToken - use invalid userId/tokenVersion
      const user = await User.findOne({ id: 1 });
      expect(user).toBeDefined();
      const accessToken = await createAccessToken(user!);

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
      //       tokenVersion: 30
      //     },
      //     :
      //   ]
      // console.log("response: ", res.body);
      expect(res.body).toHaveProperty("users");
      expect(res.body.users.length).toBeGreaterThan(1);
    });
  });
});

import faker from "faker";
import jwt, { SignOptions } from "jsonwebtoken";
import request from "supertest";
import { Connection, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import app from "../app";
import { registerMutation } from "../graphql/modules/user/register/Register.test";
import { User } from "../orm/entity/User";
import { UserEmail } from "../orm/entity/UserEmail";
import { gqlCall } from "../test-utils/gqlCall";
import testConn from "../test-utils/testConn";
import logger from "./middleware/winstonLogger";

/**
 * Send email to user with a unique link to 'Password Reset' Form
 * called by: verifyPassword_post (User.controller.ts) - handler for endpoint /user/resetpwd/5052ef22-4d6a-4d29-925a-4856148068c8
 */
describe("verifyPasswordReset", () => {
  let conn: Connection;
  let userRepo: Repository<User>;
  let emailRepo: Repository<UserEmail>;
  let fakeUser: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  };
  let dbuser: User | undefined;
  let dbUserEmail: UserEmail | undefined;
  let resetPwdFormUrl: string;
  let strResetPwdCookie: string;
  let resetPasswordCookie: {
    name: string;
    value: string;
    path: string;
    httpOnly: string;
    sameSite: string;
  };
  let tstReq: any;
  let tstResp: any;

  beforeAll(async () => {
    logger.info(" --- verifyPasswordReset.test.ts");
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    emailRepo = conn.getRepository("UserEmail");
    fakeUser = {
      id: -1,
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
    fakeUser.id = usr.data?.register.id;

    // Confirm test user
    await userRepo.update(fakeUser.id, { confirmed: true });
    await emailRepo.delete({ email: fakeUser.email });
  });

  afterAll(async () => {
    if (conn && conn.isConnected) {
      await testConn.close();
    }
  });

  beforeEach(async () => {
    dbUserEmail = undefined; // init/reset
    resetPwdFormUrl = "";
    strResetPwdCookie = "";
    tstReq = null;
    tstResp = null;

    //
    // Generate 'Reset Password' email with unique UUID
    //
    const reset = await gqlCall({
      source: "mutation ResetPassword($email: String!) { resetPassword(email: $email) }",
      variableValues: { email: fakeUser.email },
    });
    logger.silly(" -- beforeEach -->  reset.data.resetPassword:", { resetPassword: reset.data?.resetPassword });

    dbuser = await userRepo.findOne(fakeUser.id);
    logger.silly(" -- beforeEach -->  dbuser:", dbuser);

    // there's a tricky feature here ... even though user.tokenVersion is incremented, email is produced asynchronously.
    // The return value might hold a "false" value, saying: 'no email' - but it HAS to be there. Keep trying until we get it right
    async function getUserEmail(strEmail: string) {
      const usrEmail = await emailRepo.findOne({ email: strEmail });
      logger.silly(" -- getUserEmail -->  email:", { email: strEmail });
      logger.silly(" -- getUserEmail -->  usrEmail:", { usrEmail });
      return usrEmail;
    }
    let deadlockCnt = 0; // 5 attempts causes failure (succeeds after 1 attempt)
    while (deadlockCnt < 5 && dbUserEmail === undefined) {
      deadlockCnt++; // wait until the promise resolves (execution scope: while loop)
      let pause = await new Promise((resolve, _reject) => {
        // async explained: https://vahid.blog/post/2021-03-21-understanding-the-javascript-runtime-environment-and-dom-nodes/
        // 1. By calling setTimeout, the execution scope is moved from call stack to Web Workers API
        //     which returns its result to task queue.
        // 2. Since waiting time is zero, the execution scope is placed directly on task queue.
        // 3. the Event loop waits until call stack is empty (the email is sent),
        // 4. then moves the next task in line (this task) back to call stack
        setTimeout(() => resolve("finishing call stack..."), 0);
      });
      dbUserEmail = await getUserEmail(fakeUser.email); // might return undefined - then try again
      logger.silly("    while cnt=" + deadlockCnt + ", " + pause + " dbUserEmail:", { dbUserEmail });
    }
    // ready to build 'Reset Password' request:
    resetPwdFormUrl = "/user/resetpwd/" + dbUserEmail?.uuid;

    //
    // GET '/user/resetpwd/<Id>' - newPasswordForm_get --> resetPasswordForm(req, res)
    //
    const res = await request(app).get(resetPwdFormUrl).send(); // no authentication header
    logger.silly(" -- beforeEach - GET " + resetPwdFormUrl);
    logger.silly(" -- beforeEach - response: ", { response: res });

    expect(res.statusCode).toEqual(200);

    strResetPwdCookie = res.header["set-cookie"][0];
    logger.silly(" -- beforeEach - strCookie: " + JSON.stringify(strResetPwdCookie.split("; ")));
    // "set-cookie": ["roj=eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJwbGYiOjIxLCJybmwiOjEsImlhdCI6MTY0NDQzNDQ3NCwiZXhwIjoxNjQ0NDM0Nzc0fQ.Sbn6DvByeFW1i0jgf-QYOxb-vwJjquyRtYwQ_pM0FRo52gnJ6VcbliShXkTuECjI; Path=/; HttpOnly; SameSite=Strict"]
    // logger.silly(" -- beforeEach - name: " + strResetPwdCookie.split("; ")[0].split("=")[0]);
    // logger.silly(" -- beforeEach - value: " + strResetPwdCookie.split("; ")[0].split("=")[1]);
    // logger.silly(" -- beforeEach - path: " + strResetPwdCookie.split("; ")[1].split("=")[1]);
    // logger.silly(" -- beforeEach - httpOnly: " + strResetPwdCookie.split("; ")[2]);
    // logger.silly(" -- beforeEach - sameSite: " + strResetPwdCookie.split("; ")[3].split("=")[1]);
    resetPasswordCookie = {
      name: strResetPwdCookie.split("; ")[0].split("=")[0],
      value: strResetPwdCookie.split("; ")[0].split("=")[1],
      path: strResetPwdCookie.split("; ")[1].split("=")[1],
      httpOnly: strResetPwdCookie.split("; ")[2],
      sameSite: strResetPwdCookie.split("; ")[3].split("=")[1],
    };
    logger.silly(" -- beforeEach - resetPasswordCookie: ", { resetPasswordCookie });
    expect(resetPasswordCookie.name).toEqual("roj");
    expect(resetPasswordCookie.path).toEqual("/");
    expect(resetPasswordCookie.httpOnly).toEqual("HttpOnly");
    expect(resetPasswordCookie.sameSite).toEqual("Strict");
  });

  //
  // POST '/user/resetpwd/<Id>' - verifyPassword_post --> verifyPasswordReset(req, res)
  //
  describe("verifyPasswordReset", () => {
    test("302 Success ", async () => {
      logger.debug(" -- 302 Success --> POST /user/resetpwd/" + dbUserEmail?.uuid);
      logger.silly(" -- 302 Success --> dbuser", dbuser);
      logger.silly(" -- 302 Success --> dbUserEmail", dbUserEmail);
      logger.silly(" -- 302 Success --> resetPwdFormUrl: " + resetPwdFormUrl); // '/user/resetpwd/' + uuid
      expect(resetPwdFormUrl.length).toBe(String("/user/resetpwd/").length + 36);

      // POST '/user/resetpwd/<Id>' - verifyPassword_post --> verifyPasswordReset(req, res)
      tstReq = await request(app);
      tstResp = await tstReq
        .post("/user/resetpwd/" + dbUserEmail?.uuid) // req.params.id
        .set("Cookie", `roj=${resetPasswordCookie.value}`) // req.cookies.roj
        .send({ pwd: "n3xtPw61" }); // req.body.pwd
      logger.silly(" -- 302 Success --> response: ", { tstResp: tstResp });

      expect(tstResp.status).toBe(302);
      expect(tstResp.text).toEqual(`Found. Redirecting to http://${process.env.DOMAIN}:${process.env.PORT}/`);
    }); // 302 Success

    test("400 uuid altered", async () => {
      logger.debug(" -- 400 uuid altered --> POST /user/resetpwd/" + dbUserEmail?.uuid);
      expect(resetPwdFormUrl.length).toBe(String("/user/resetpwd/").length + 36);

      let fakeUuid = dbUserEmail?.uuid; // e.g.: bc0f2317-a068-436c-aa5c-61c52f21e9c9
      if (dbUserEmail?.uuid?.charAt(35) === "a") {
        fakeUuid = `${dbUserEmail?.uuid.slice(0, 35)}c`;
      } else {
        fakeUuid = `${dbUserEmail?.uuid.slice(0, 35)}a`;
      }
      logger.silly(" -- 400 uuid altered --> UUID: " + dbUserEmail?.uuid);
      logger.silly(" -- 400 uuid altered --> fake: " + fakeUuid);

      // POST '/user/resetpwd/<Id>' - verifyPassword_post --> verifyPasswordReset(req, res)
      tstReq = await request(app);
      tstResp = await tstReq
        .post("/user/resetpwd/" + fakeUuid) // req.params.id
        .set("Cookie", `roj=${resetPasswordCookie.value}`) // req.cookies.roj
        .send({ pwd: "n3xtPw62" }); // req.body.pwd
      logger.silly(" -- 400 uuid altered --> response: ", { tstResp: tstResp });

      expect(tstResp.status).toBe(400);
      expect(tstResp.text).toEqual("BadRequestError: Expired or invalid input");
    }); // 400 uuid altered

    test("400 uuid replaced with another genuine uuid", async () => {
      logger.debug(" -- 400 uuid replaced --> POST /user/resetpwd/" + dbUserEmail?.uuid);
      // String("/user/resetpwd/").length = 16 + uuid: char(36);
      expect(resetPwdFormUrl.length).toBe(String("/user/resetpwd/").length + 36);

      let fakeUuid = await uuidv4(); // e.g.: bc0f2317-a068-436c-aa5c-61c52f21e9c9
      logger.silly(" -- 400 uuid replaced --> UUID: " + dbUserEmail?.uuid);
      logger.silly(" -- 400 uuid replaced --> fake: " + fakeUuid);

      // POST '/user/resetpwd/<Id>' - verifyPassword_post --> verifyPasswordReset(req, res)
      tstReq = await request(app);
      tstResp = await tstReq
        .post("/user/resetpwd/" + fakeUuid) // req.params.id
        .set("Cookie", `roj=${resetPasswordCookie.value}`) // req.cookies.roj
        .send({ pwd: "n3xtPw63" }); // req.body.pwd
      logger.silly(" -- 400 uuid replaced --> response: ", { tstResp: tstResp });

      expect(tstResp.status).toBe(400);
      expect(tstResp.text).toEqual("BadRequestError: Expired or invalid input");
    }); // 400 uuid replaced with another genuine uuid

    test("400 modified cookie payload", async () => {
      logger.debug(" -- 400 modified cookie payload --> POST /user/resetpwd/" + dbUserEmail?.uuid);
      // { plf: user.id, rnl: user.tokenVersion }; // resetToken payload
      logger.silly(" -- 400 modified cookie payload = { id: 999, tokenVersion: 1 }");
      const resetPayload = { id: 999, tokenVersion: 1 };
      const resetOptions: SignOptions = {
        header: { alg: "HS384", typ: "JWT" },
        expiresIn: "5m",
        algorithm: "HS384",
      };
      const resetToken = jwt.sign(resetPayload, process.env.JWT_ACCESS_TOKEN_SECRET!, resetOptions); // expected to return 401 Expired or invalid input

      // POST '/user/resetpwd/<Id>' - verifyPassword_post --> verifyPasswordReset(req, res)
      tstReq = await request(app);
      tstResp = await tstReq
        .post("/user/resetpwd/" + dbUserEmail?.uuid) // req.params.id
        .set("Cookie", `roj=${resetToken}`) // req.cookies.roj
        .send({ pwd: "n3xtPw63" }); // req.body.pwd
      logger.silly(" -- 400 modified cookie payload --> response: ", { tstResp: tstResp });

      expect(tstResp.status).toBe(400);
      expect(tstResp.text).toEqual("AuthorizationError: Expired or invalid input");
    }); // 400 modified cookie payload
  }); // verifyPasswordReset
});

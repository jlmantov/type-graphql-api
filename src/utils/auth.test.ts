import { CookieOptions } from "express";
import faker from "faker";
import jwt, { SignOptions } from "jsonwebtoken";
import request from "supertest";
import { Connection, Repository } from "typeorm";
import app from "../app";
import { registerMutation } from "../graphql/modules/user/register/Register.test";
import { GraphqlContext } from "../graphql/utils/GraphqlContext";
import { User } from "../orm/entity/User";
import { gqlCall } from "../test-utils/gqlCall";
import testConn from "../test-utils/testConn";
import {
  createAccessToken,
  createRefreshToken,
  createResetPasswordToken,
  getJwtPayload,
  JwtAccessPayload,
  JwtResetPayload,
  revokeRefreshTokens
} from "./auth";
import logger from "./middleware/winstonLogger";

/**
 *
 */
describe("auth", () => {
  let conn: Connection;
  let userRepo: Repository<User>;
  let fakeUser: { firstname: string; lastname: string; email: string; password: string };
  let dbuser: User | undefined;

  beforeAll(async () => {
    logger.info(" --- auth.test.ts");
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    fakeUser = {
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(8),
    };
    await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });
    dbuser = await userRepo.findOne({ where: { email: fakeUser.email } });
  });

  afterAll(async () => {
    if (conn && conn.isConnected) {
      await testConn.close();
    }
  });

  describe("Create and validate token", () => {
    describe("revokeRefreshToken", () => {
      let tstReq: any;
      let tstResp: any;
      let refreshToken: string;
      let ctx: GraphqlContext;
      let mockedClearCookieCalled = false;
      // let mockedCookie = "";

      beforeEach(async () => {
        // preparations
        tstReq = await request(app);
        refreshToken = await createRefreshToken(dbuser!);
        tstResp = await tstReq
          .post("/renew_accesstoken")
          .set("Cookie", `jid=${refreshToken}`)
          .send();
        logger.silly(" -- revokeRefreshToken beforeEach: " + tstResp?.headers["set-cookie"][0]);

        ctx = {
          req: tstReq,
          res: {
            clearCookie: (name: string, options?: CookieOptions | undefined) => {
              logger.silly(" -- clearCookie - name=" + name + ", options:", options);
              expect(name).toEqual("jid");
              expect(options).toBeUndefined();
              mockedClearCookieCalled = true;
              // mockedCookie = name;
            },
            ...tstResp,
          },
          user: {
            id: dbuser!.id,
            tokenVersion: dbuser!.tokenVersion,
          } as User,
        }; // GraphqlContext

        mockedClearCookieCalled = false;
      });

      test("Success - revokeRefreshToken", async () => {
        // renew_accesstoken_post is handler for endpoint '/renew_accesstoken' - which is tested in routes.test.ts
        expect(dbuser).toBeDefined();
        expect(dbuser?.id).toBeDefined();
        expect(dbuser?.tokenVersion).toBeDefined();
        expect(tstReq).toBeDefined();
        expect(tstResp).toBeDefined();
        expect(refreshToken).toBeDefined();
        expect(refreshToken!.length > 100).toBe(true); // 170, 172 or so ...
        expect(ctx).toBeDefined();
        expect(ctx.user).toBeDefined();
        expect(ctx.user?.id).toBeDefined();
        expect(ctx.user?.tokenVersion).toBeDefined();
        expect(ctx.res.clearCookie).toBeDefined();
        // preconditions confirmed

        let response = await revokeRefreshTokens(ctx); // <<< subject of test
        expect(response).toBe(true);
        expect(ctx.user!.tokenVersion).toBe(dbuser!.tokenVersion + 1);
      }); // Success - revokeRefreshToken

      test("should fail, invalid userId", async () => {
        // renew_accesstoken_post is handler for endpoint '/renew_accesstoken' - which is tested in routes.test.ts
        expect(dbuser).toBeDefined();
        expect(dbuser?.id).toBeDefined();
        expect(dbuser?.tokenVersion).toBeDefined();
        expect(tstReq).toBeDefined();
        expect(tstResp).toBeDefined();
        expect(refreshToken).toBeDefined();
        expect(refreshToken!.length > 100).toBe(true); // 170, 172 or so ...
        expect(ctx).toBeDefined();
        expect(ctx.user).toBeDefined();
        expect(ctx.user?.id).toBeDefined();
        expect(ctx.user?.tokenVersion).toBeDefined();
        expect(ctx.res.clearCookie).toBeDefined();
        // preconditions confirmed

        ctx.user!.id = 999; // force revokeRefreshTokens to fail on user lookup

        let response = await revokeRefreshTokens(ctx); // <<< subject of test
        expect(response).toBe(false);
        expect(mockedClearCookieCalled).toBe(false);
        // expect(mockedCookie).toEqual("");
        expect(ctx.user!.tokenVersion).toEqual(dbuser!.tokenVersion);
      }); // Failure - revokeRefreshToken
    }); // revokeRefreshToken
  }); // Create and validate token

  // ------------------------------------

  describe("getJwtPayload", () => {
    test("Success - accessToken", async () => {
      expect(dbuser).toBeDefined();
      expect(typeof dbuser!.id === "number").toBe(true);
      expect(typeof dbuser!.tokenVersion === "number").toBe(true);
      let token = await createAccessToken(dbuser!);
      let payload;
      try {
        payload = getJwtPayload(token) as JwtAccessPayload; // JwtAccessPayload | JwtResetPayload
        expect(payload.iat).toBeDefined();
        expect(payload.exp).toBeDefined();
        expect(payload.bit).toBeDefined();
        expect(payload.ogj).toBeDefined();
        expect(typeof payload.bit === "string").toBe(true);
        expect(typeof payload.ogj === "number").toBe(true);
        expect(payload.bit).toEqual(dbuser!.id); // string
        expect(payload.ogj).toBe(Number(dbuser!.tokenVersion)); // number
      } catch (error) {
        expect(error.status).toBeUndefined(); // This should never happen!!
      }
    }); // Success - accessToken

    test("Success - resetPasswordToken", async () => {
      expect(dbuser).toBeDefined();
      let token = await createResetPasswordToken(dbuser!);
      let payload;
      try {
        payload = getJwtPayload(token) as JwtResetPayload; // JwtAccessPayload | JwtResetPayload
        expect(payload.iat).toBeDefined();
        expect(payload.exp).toBeDefined();
        expect(payload.plf).toBeDefined();
        expect(payload.rnl).toBeDefined();
        expect(typeof payload.plf === "string").toBe(true);
        expect(typeof payload.rnl === "number").toBe(true);
        expect(payload.plf).toEqual(dbuser!.id); // string
        expect(payload.rnl).toBe(Number(dbuser!.tokenVersion)); // number
      } catch (error) {
        expect(error.status).toBeUndefined(); // This should never happen!!
      }
    }); // Success - resetPasswordToken

    test("should fail with 401 on 'invalid input'", async () => {
      let payload;
      const invalidAccessToken =
        "eyXXXxxxXXXxxxXXXxxxXXX5cCI6IkpXVCJ9.eyXXXxxxXXXxxxXXXxxxXXXiaWF0IjoxNjQzOTYxMDQyLCJleHAiOjE2NDM5NjE5NDJ9.UjXXXxxxXXXxxxXXXxxxXXXlmSyLhXAIGEVhEF_ydQqj_Oy5XjmROJQrnw_Gsmqe";

      try {
        payload = getJwtPayload(invalidAccessToken);
        logger.error("This line will never be reached - payload:", payload);
      } catch (error) {
        logger.silly(" -- 401 token header manipulated - error:", error);
        expect(error.status).toEqual(401);
        expect(error.message).toEqual("Expired or invalid input");
      }
    }); // should fail with 401 on 'invalid input' - token header manipulated

    test("should fail with 403 on 'access expired'", async () => {
      let payload;

      const accessPayload = { bit: dbuser?.id, ogj: Number(dbuser?.tokenVersion) };
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

      try {
        payload = getJwtPayload(expiredAccessToken);
        logger.error("This line will never be reached - payload:", payload);
      } catch (error) {
        logger.silly(" -- 403 Access expired - error:", error);
        expect(error.status).toEqual(403);
        expect(error.message).toEqual("Access expired, please login again");
      }
    }); // should fail with 403 on 'access expired' - old token header

    test("should fail with 401 - accesstoken with empty payload", async () => {
      // { plf: user.id, rnl: user.tokenVersion }; // resetPasswordToken payload
      // { bit: user.id, ogj: user.tokenVersion }; // accessToken payload
      logger.silly(" -- 401 accesstoken payload = {}");
      const accessPayload = {}; // payload ends with something like {"exp":1644398362,"iat":1644397462}
      const accessOptions: SignOptions = {
        header: { alg: "HS384", typ: "JWT" },
        expiresIn: "15m",
        algorithm: "HS384",
      };
      const emptyPayloadAccessToken = jwt.sign(
        accessPayload,
        process.env.JWT_ACCESS_TOKEN_SECRET!,
        accessOptions
      );

      try {
        const payload = getJwtPayload(emptyPayloadAccessToken);
        logger.error("This line will never be reached - payload:", payload);
      } catch (error) {
        logger.silly(" -- 401 accesstoken invalid input - error:", error);
        expect(error.status).toEqual(401);
        expect(error.message).toEqual("Expired or invalid input");
      }
    }); // should fail with 401 - accesstoken with empty payload

    test("should fail with 401 - accesstoken with manipulated payload", async () => {
      // { bit: user.id, ogj: user.tokenVersion }; // accessToken payload
      logger.silly(" -- 401 accesstoken payload = {}");
      const accessPayload = { id: 999, tokenVersion: 1 };
      const accessOptions: SignOptions = {
        header: { alg: "HS384", typ: "JWT" },
        expiresIn: "7d",
        algorithm: "HS384",
      };
      const emptyPayloadAccesstoken = jwt.sign(
        accessPayload,
        process.env.JWT_ACCESS_TOKEN_SECRET!,
        accessOptions
      );

      try {
        const payload = getJwtPayload(emptyPayloadAccesstoken);
        logger.error("This line will never be reached - payload:", payload);
      } catch (error) {
        logger.silly(" -- 401 accesstoken invalid input - error:", error);
        expect(error.status).toEqual(401);
        expect(error.message).toEqual("Expired or invalid input");
      }
    }); // should fail with 401 - accesstoken with manipulated payload

    test("should fail with 401 - refreshtoken with empty payload", async () => {
      // { kew: user.id, tas: user.tokenVersion }; // refreshToken payload
      logger.silly(" -- 401 refreshtoken payload = {}");
      const refreshPayload = {}; // payload ends with something like {"exp":1644398362,"iat":1644397462}
      const refreshOptions: SignOptions = {
        header: { alg: "HS384", typ: "JWT" },
        expiresIn: "15m",
        algorithm: "HS384",
      };
      const emptyPayloadRefreshToken = jwt.sign(
        refreshPayload,
        process.env.JWT_REFRESH_TOKEN_SECRET!,
        refreshOptions
      );

      try {
        const payload = getJwtPayload(emptyPayloadRefreshToken);
        logger.error("This line will never be reached - payload:", payload);
      } catch (error) {
        logger.silly(" -- 401 refreshtoken invalid input - error:", error);
        expect(error.status).toEqual(401);
        expect(error.message).toEqual("Expired or invalid input");
      }
    }); // should fail with 401 - refreshtoken with empty payload

    test("should fail with 401 - refreshtoken with manipulated payload", async () => {
      // { kew: user.id, tas: user.tokenVersion }; // refreshToken payload
      logger.silly(" -- 401 refreshtoken payload = {}");
      const refreshPayload = { id: 999, tokenVersion: 1 };
      const refreshOptions: SignOptions = {
        header: { alg: "HS384", typ: "JWT" },
        expiresIn: "7d",
        algorithm: "HS384",
      };
      const emptyPayloadRefreshToken = jwt.sign(
        refreshPayload,
        process.env.JWT_REFRESH_TOKEN_SECRET!,
        refreshOptions
      );

      try {
        const payload = getJwtPayload(emptyPayloadRefreshToken);
        logger.error("This line will never be reached - payload:", payload);
      } catch (error) {
        logger.silly(" -- 401 refreshtoken invalid input - error:", error);
        expect(error.status).toEqual(401);
        expect(error.message).toEqual("Expired or invalid input");
      }
    }); // should fail with 401 - refreshtoken with manipulated payload
  }); // getJwtPayload
});

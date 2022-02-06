import express from "express";
import { Express } from "express-serve-static-core";
import request from "supertest";
import HttpError from "../httpError";
import errorMiddleware from "./error";
import logger from "./winstonLogger";

/**
 *
 */
describe("error", () => {
  let tstApp: Express;

  beforeAll(async () => {
    logger.info(" --- error.test.ts");
    tstApp = express();
    const testRouter = express.Router();
    testRouter.get("/", (_req, res) => res.status(200).send("OK"));
    testRouter.get("/test/:statuscode", (req, res) => {
      const _statuscode = Number(req.params.statuscode ?? 500);
      const msg = `TEST Error Message - status ${_statuscode}`;
      if (_statuscode === 200) {
        res.status(_statuscode).send(msg);
      } else {
        throw new HttpError(_statuscode, "TestError", msg); // send response through middleware function
      }
    });
    tstApp.use("/", testRouter);
    tstApp.use(errorMiddleware); // <-- This is the actual subject to be tested.
  });

  afterAll(async () => {});

  describe("Test status 200: OK", () => {
    test("verify supertest setup", async () => {
      const res = await request(tstApp).get("/");
      // logger.debug("res: ",
      //   "\ntype:", res.type,
      //   "\nstatus:", res.status,
      //   "\ntext:", res.text,
      //   "\nbody:", res.body,
      //   // "\nheaders:", res.headers,
      //   "\nerror:", res.error
      // );

      expect(res.status).toEqual(200);
      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual("OK");
    }); // verify test setup
  });

  describe("Test status 400: Expired or invalid input", () => {
    test("Invalid input (authentication header)", async () => {
      const res = await request(tstApp)
        .get("/test/400")
        .set("Authorization", "bearer manipulated. Content makes no sense");
      // logger.debug("res: ",
      //   "\ntype:", res.type,
      //   "\nstatus:", res.status,
      //   "\ntext:", res.text,
      //   "\nbody:", res.body,
      //   // "\nheaders:", res.headers,
      //   "\nerror:", res.error
      // );

      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual("Expired or invalid input");
    }); // Invalid input (authentication header)

    test("Unhandled request - 414 URI Too Long", async () => {
      const res = await request(tstApp).get("/test/414");
      // logger.debug("res: ",
      //   "\ntype:", res.type,
      //   "\nstatus:", res.status,
      //   "\ntext:", res.text,
      //   "\nbody:", res.body,
      //   // "\nheaders:", res.headers,
      //   "\nerror:", res.error
      // );

      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual("Expired or invalid input");
    }); // Unhandled status - 414 URI Too Long
  }); // Status 400: Expired or invalid input

  describe("Test status 401: Not authenticated", () => {
    test("No authentication header", async () => {
      const res = await request(tstApp).get("/test/401");
      // logger.debug("res: ",
      //   "\ntype:", res.type,
      //   "\nstatus:", res.status,
      //   "\ntext:", res.text,
      //   "\nbody:", res.body,
      //   // "\nheaders:", res.headers,
      //   "\nerror:", res.error
      // );

      expect(res.statusCode).toEqual(401);
      expect(res.text).toEqual("Not authenticated");
    }); // No authentication header
  }); // Status 401: Not authenticated

  describe("Test status 403: Access expired, please login again", () => {
    test("Access token expired", async () => {
      // expired access token
      const accessToken =
        "eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJiaXQiOjE3LCJvZ2oiOjQ3LCJpYXQiOjE2NDAxNzkyOTcsImV4cCI6MTY0MDE4MDE5N30.blYGmrKt4XSPL_mScmig31tocV30tLExGbUNrTCTByIm5AP7vtK8if0-dsH1JPln";

      const res = await request(tstApp)
        .get("/test/403")
        .set("Authorization", "bearer " + accessToken);
      // logger.debug("res: ",
      //   "\ntype:", res.type,
      //   "\nstatus:", res.status,
      //   "\ntext:", res.text,
      //   "\nbody:", res.body,
      //   // "\nheaders:", res.headers,
      //   "\nerror:", res.error
      // );

      expect(res.statusCode).toEqual(403);
      expect(res.text).toEqual("Access expired, please login again");
    }); // Access token expired
  }); // Status 403: Access expired, please login again

  describe("Test default 500: Something went wrong", () => {
    test("Unhandled request - 507 Insufficient Storage (WebDAV)", async () => {
      const res = await request(tstApp).get("/test/507");
      // logger.debug("res: ",
      //   "\ntype:", res.type,
      //   "\nstatus:", res.status,
      //   "\ntext:", res.text,
      //   "\nbody:", res.body,
      //   // "\nheaders:", res.headers,
      //   "\nerror:", res.error
      // );

      expect(res.statusCode).toEqual(500);
      expect(res.text).toEqual("Something went wrong");
    }); // Unhandled request - 507 Insufficient Storage (WebDAV)
  }); // Default 500: Something went wrong
});

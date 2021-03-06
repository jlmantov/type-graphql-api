import cookieParser from "cookie-parser";
import express from "express";
import { renew_accesstoken_post } from "../utils/auth";
import HttpError from "../utils/httpError";
import userRouter from "./user";

const router = express.Router();
router.use("/", cookieParser());

/**
 * GET "/" - landing page
 */
router.get("/", (_req, res) => res.send("hello")); // send 'hello' to http://localhost:4000/

/**
 * GET "/asdf" - produce error
 */
router.get("/asdf", (_req, _res) => {
  throw new HttpError(501, "NotImplementedError", "error thrown navigating to '/asdf", { label: "userRouter" });
}); // send 'hello' to http://localhost:4000/

/**
 * POST "/renew_accesstoken" - requires cookie with refreshToken.
 */
router.post("/renew_accesstoken", renew_accesstoken_post);

/**
 * users
 */
router.use("/user/", userRouter);

export default router;

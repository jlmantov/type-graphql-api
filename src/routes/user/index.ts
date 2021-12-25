import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import "reflect-metadata";
import {
	newPasswordForm_get,
	users_get,
	user_confirmEmail_get,
	verifyPassword_post
} from "../../controllers/users/User.controller";
import { isAuth } from "../../utils/middleware/isAuth";

export const CONFIRMUSER = "confirm";
export const RESETPWD = "resetpwd";

const router = express.Router();

/**
 * Add extra security for verifyPassword_post:
 * 1. a JWT token ensures a session timeout on password update form
 * 2. CORS with origin domain string - only requests from "http://localhost:4000" will be allowed.
 * 3. use a cookie (http-only + sameSite='Strict') to store JWT token
 * 	- javascript write protection
 * 	- request can only come frome one place
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies
 */
const restrictedAccess = express.Router();
const corsOptions = {
  origin: `http://${process.env.DOMAIN}:${process.env.PORT}`,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
restrictedAccess.use(cors(corsOptions));
restrictedAccess.use(bodyParser.urlencoded({ extended: true }));
restrictedAccess.use(bodyParser.json());

/**
 * POST "/user/resetpwd/:id" - activated from newPasswordForm_get
 */
restrictedAccess.post("/" + RESETPWD + "/:id", verifyPassword_post);
router.use("/", restrictedAccess);

/**
 * GET "/user/resetpwd/:id" - activated from email, public access
 */
router.get("/" + RESETPWD + "/:id", newPasswordForm_get);

/**
 * GET "/user/confirm/:id" - activated from email
 */
router.get("/" + CONFIRMUSER + "/:id", user_confirmEmail_get);

/**
 * GET /user/ - requires JWT accessToken
 */
router.get("/", isAuth, users_get);

export default router;

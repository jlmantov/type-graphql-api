import { Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import { User } from "../orm/entity/User";
import { UserEmail } from "../orm/entity/UserEmail";
import { RESETPWD } from "../routes/user";
import { getJwtPayload, JwtResetPayload } from "./auth";
import { hash } from "./crypto";
import HttpError from "./httpError";

/**
 * Verify input from 'Reset password' response. If all is fine, update hashedPassword in DB
 * Maximize security by combining different input:
 * 1. url param uuid is used to validate userEmail.reason
 * 2. token payload.exp is matched against UserEmail.createdAt to verify 'window of opportunity'
 * 3. token payload userId AND tokenVersion is matched against user in DB
 * 4. user.email is matched against userEmail.email
 * @param req uuid, password and token from 'Reset password' user dialog
 * @param res express response - not used
 * @returns boolean - true if hashedPassword is updated, false/error otherwise
 */
export const verifyPasswordReset = async (req: Request, _res: Response) => {
  if (!req.params.id) {
    // url param missing
    throw new HttpError(400, "BadRequestError", "Request input not valid"); // anonymous error, user might be looking for a vulnerabilities
  }
  if (!req.body.pwd) {
    // Password missing
    throw new HttpError(400, "BadRequestError", "Request input not valid"); // anonymous error, user might be looking for a vulnerabilities
  }
  if (!req.cookies.roj) {
    // cookie missing
    throw new HttpError(400, "BadRequestError", "Request input not valid"); // anonymous error, user might be looking for a vulnerabilities
  }

  //   validate uuid
  let validUUID = false;
  const uuid = req.params.id;
  validUUID = uuidValidate(uuid);
  if (!validUUID) {
    // Invalid uuid!
    throw new HttpError(400, "BadRequestError", "Expired or invalid input"); // anonymous error, user might be looking for a vulnerabilities
  }

  //   validate token
  let payload: JwtResetPayload | undefined = undefined;
  let reqUsr = {
    id: 0,
    tokenVersion: -1,
  };
  try {
    const token = req.cookies.roj;
    payload = getJwtPayload(token) as JwtResetPayload; // verified attribute userId
    reqUsr = {
      id: parseInt(payload.plf, 10),
      tokenVersion: payload.rnl
    }
  } catch (error) {
    // console.log("Invalid token payload: ", error); // log token verification error
    throw new HttpError(400, "BadRequestError", "Expired or invalid input"); // anonymous error, user might be looking for a vulnerabilities
  }

  if (!reqUsr.id || reqUsr.tokenVersion < 0) {
    throw new HttpError(400, "BadRequestError", "Expired or invalid input"); // anonymous error, user might be looking for a vulnerabilities
  }

  const userEmail = await UserEmail.findOne({ where: { uuid, reason: RESETPWD } });
  if (!userEmail) {
    // userEmail not found
    throw new HttpError(400, "BadRequestError", "Expired or invalid input"); // anonymous error, user might be looking for a vulnerabilities
  }

  const now = Math.floor(Date.now() / 1000);
  // const createdAt = new Date(userEmail.createdAt).getTime() / 1000;
  // console.log("userEmail: " + userEmail + ", now: " + now + ", Int createdAt: " + createdAt); // 5m = 5*60s = 300s <=> exp = iat + 300
  if (payload.exp < now) {
    // Token expired!
    throw new HttpError(400, "BadRequestError", "Expired or invalid input"); // anonymous error, user might be looking for a vulnerabilities
  }

  const pwd = req.body.pwd;
  const hashedPwd = await hash(pwd);

  // console.log("User.findOne: ", { id: pUserId, email: userEmail.email, tokenVersion: pTokenVersion, confirmed: true });
  const user = await User.findOne({
    where: {
      id: reqUsr.id,
      email: userEmail.email,
      tokenVersion: reqUsr.tokenVersion,
      confirmed: true,
    },
  });
  if (!(user instanceof User)) {
    throw new HttpError(400, "BadRequestError", "Expired or invalid input"); // anonymous error, user might be looking for a vulnerabilities
  }

  const updRes = await User.update(user.id, { password: hashedPwd });
  if (updRes.affected === 1) {
    // console.log("Password updated on user: ", JSON.stringify(user)); // 5m = 5*60s = 300s <=> exp = iat + 300
    UserEmail.delete(userEmail.id); // only cleanup if password was actually enabled
  }
  return !!updRes.affected; // true if more than zero rows were affected by the update
};

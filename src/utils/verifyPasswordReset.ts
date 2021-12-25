import { Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import { User } from "../graphql/entity/User";
import { UserEmail } from "../graphql/entity/UserEmail";
import { RESETPWD } from "../routes/user";
import { getJwtPayload, JwtResetPayload } from "./auth";
import { hash } from "./crypto";

/**
 * Verify input from 'Reset password' response. Is all is fine, update hashedPassword in DB
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
    // throw new Error("url param missing!");
    throw new Error("Cannot POST /user/resetpwd/"); // anonymous error, user might be looking for a vulnerabilities
  }
  //   validate POST params existence
  if (!req.body.pwd) {
    // throw new Error("Passwordmissing!");
    throw new Error("Cannot POST /user/resetpwd/"); // anonymous error, user might be looking for a vulnerabilities
  }
  if (!req.cookies.roj) {
    // throw new Error("cookie missing!");
    throw new Error("Cannot POST /user/resetpwd/"); // anonymous error, user might be looking for a vulnerabilities
  }

  //   validate uuid
  let validUUID = false;
  const uuid = req.params.id;
  validUUID = uuidValidate(uuid);
  if (!validUUID) {
    // throw new Error("Invalid uuid!");
    throw new Error("Expired or invalid input!"); // anonymous error, user might be looking for a vulnerabilities
  }

  //   validate token
  let payload: JwtResetPayload | undefined = undefined;
  let pUserId: string = "";
  let pTokenVersion: number = -1;
  try {
    const token = req.cookies.roj;
    // resetPayload = { plf: user.id, rnl: user.tokenVersion };
    payload = getJwtPayload(token) as JwtResetPayload; // verified attribute userId
    pUserId = payload.plf;
    pTokenVersion = payload.rnl;
  } catch (error) {
    throw error; // propagate possible token verification error from 'deeper layers'
  }

  if (!payload.plf || !payload.rnl) {
    // throw new Error("Invalid token payload!");
    throw new Error("Expired or invalid input!"); // anonymous error, user might be looking for a vulnerabilities
  }

  const userEmail = await UserEmail.findOne({ where: { uuid, reason: RESETPWD } });
  if (!userEmail) {
    // throw new Error("userEmail not found!");
    throw new Error("Expired or invalid input!"); // anonymous error, user might be looking for a vulnerabilities
  }

  const now = Math.floor(Date.now() / 1000);
  // const createdAt = new Date(userEmail.createdAt).getTime() / 1000;
  // console.log("userEmail: " + userEmail + ", now: " + now + ", Int createdAt: " + createdAt); // 5m = 5*60s = 300s <=> exp = iat + 300
  if (payload.exp < now) {
    // throw new Error("Token expired!"); // Too late
    throw new Error("Expired or invalid input!"); // anonymous error, user might be looking for a vulnerabilities
  }

  const pwd = req.body.pwd;
  const hashedPwd = await hash(pwd);

  // console.log("User.findOne: ", { id: pUserId, email: userEmail.email, tokenVersion: pTokenVersion, confirmed: true });
  const user = await User.findOne({
    where: {
      id: pUserId,
      email: userEmail.email,
      tokenVersion: pTokenVersion,
      confirmed: true,
    },
  });
  if (!(user instanceof User)) {
    // throw new Error("User not found!");
    throw new Error("Expired or invalid input!"); // anonymous error, user might be looking for a vulnerabilities
  }

  const updRes = await User.update(user.id, { password: hashedPwd });
  if (updRes.affected === 1) {
    console.log("Password updated on user: ", JSON.stringify(user)); // 5m = 5*60s = 300s <=> exp = iat + 300
    UserEmail.delete(userEmail.id); // only cleanup if password was actually enabled
  }
  return !!updRes.affected; // true if more than zero rows were affected by the update
};

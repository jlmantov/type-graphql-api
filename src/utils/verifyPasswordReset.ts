import { Request, Response } from "express";
import { validate as uuidValidate } from "uuid";
import { User } from "../entity/User";
import { UserEmail } from "../entity/UserEmail";
import { getJwtAccessPayload } from "./auth";
import { hash } from "./crypto";
import { RESETPWD } from "./sendEmail";

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
  let validUUID = false;
  if (!req.params.id) {
    throw new Error("Invalid input!"); // anonymous error, user might be looking for a weakness
  }
  //   validate uuid
  const uuid = req.params.id;
  validUUID = uuidValidate(uuid);
  if (!validUUID) {
    throw new Error("Invalid input!"); // anonymous error, user might be looking for a weakness
  }

  //   validate POST params existence
  if (!req.body.pwd || !req.body.token) {
    throw new Error("Invalid input!"); // anonymous error, user might be looking for a weakness
  }
  //   validate token
  const payload = getJwtAccessPayload(req.body.token);
  if (!payload.userId || !payload.v) {
    throw new Error("Expired or invalid token!"); // anonymous error, user might be looking for a weakness
  }
  console.log("payload.iat", payload.iat);
  console.log("payload.exp", payload.exp);

  const userEmail = await UserEmail.findOne({ where: { uuid, reason: RESETPWD } });
  if (!userEmail) {
    throw new Error("Invalid input!"); // anonymous error, user might be looking for a weakness
  }

  console.log("userEmail.createdAt", userEmail.createdAt);
  const createdAt = new Date(userEmail.createdAt).getTime() / 1000;
  console.log("createdAt", createdAt); // 3m = 3*60s = 180s <=> exp = iat + 180
  if (payload.exp < createdAt + 180) {
    // timespan outside 'window of opportunity'
    throw new Error("Expired or invalid token!"); // anonymous error, user might be looking for a weakness
  }

  const pwd = req.body.pwd;
  const hashedPwd = await hash(pwd);

  const user = await User.findOne({
    where: { id: payload.userId, email: userEmail.email, tokenVersion: payload.v, confirmed: true },
  });
  if (!user) {
    throw new Error("User not found!");
  }

  if (!(user instanceof User)) {
    throw new Error("User not found!");
  }

  const updRes = await User.update(user.id, { password: hashedPwd });
  if (updRes.affected === 1) {
    UserEmail.delete(userEmail.id); // only cleanup if password was actually enabled
  }
  return !!updRes.affected; // true if more than zero rows were affected by the update
};

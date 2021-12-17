import { Request, Response } from "express";
import jwt, { SignOptions, verify } from "jsonwebtoken";
import { getConnection } from "typeorm";
import { User } from "../entity/User";
import { GraphqlContext } from "./GraphqlContext";

export interface JwtAccessPayload {
  userId: string;
  v: number;
}

/**
 * @param user the user who attempts to login
 * @returns JWT accessToken
 */
export const createAccessToken = async (user: User) => {
  const accessPayload = { userId: user.id, v: user.tokenVersion }; // typesafety - could be: parseInt(user.id.toString())
  const accessOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "15m",
    algorithm: "HS384",
  };
  // console.log("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
  return await jwt.sign(accessPayload, process.env.JWT_ACCESS_TOKEN_SECRET!, accessOptions);
};

/**
 * @param user the user who attempts to login
 * @returns JWT refreshToken
 */
export const createRefreshToken = async (user: User) => {
  const refreshPayload = { userId: user.id, v: user.tokenVersion };
  const refreshOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "7d",
    algorithm: "HS384",
  };
  // console.log("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
  return await jwt.sign(refreshPayload, process.env.JWT_REFRESH_TOKEN_SECRET!, refreshOptions);
};

/**
 * renew cookie content, replace refreshToken
 * @param res express response
 * @param refreshToken
 */
export const sendRefreshToken = (res: Response, refreshToken: string) => {
  res.cookie("jid", refreshToken, { httpOnly: true }); // name it something anonymous - so nobody gets any clue to what's going on...
};

/**
 * 1. get refreshToken from cookie,
 * 2. call jsonwebtoken.verify
 * 3. verify tokenVersion in DB
 * 4. generate new accessToken or deny access (require re-login)
 * @param req express request
 * @param res express response
 */
export const handleJwtRefreshTokenRequest = async (req: Request, res: Response) => {
  // Create a POST request with a cookie attached - in Postman (or similar)
  // console.log("refreshtoken req.cookies: ", req.cookies);
  // 1. npm start, 2. POST req w. cookie from Postman, 3. conlose.log verified content. Great, let's move on.
  const token = req.cookies.jid;
  if (!token) {
    return res.send({ ok: false, accessToken: "" });
  }

  let payload: any = null;
  try {
    payload = verify(token, jwtRefreshSecretKey);
  } catch (error) {
    console.error(error.name + ": " + error.message + "!"); // ex.: 'JsonWebTokenError: jwt expired!'
    return res.send({ ok: false, accessToken: "", error: error.message });
  }

  //  token is valid and we can return an accessToken
  const user = await User.findOne({ id: payload.userId });
  if (!user) {
    // this should not really happen since userId comes from refreshToken - but then again... DB is down or whatever
    return res.send({ ok: false, accessToken: "" });
  }

  // console.log(
  //   `handleJwtRefreshTokenRequest: payload.v=${payload.v}, DB tokenVersion=${user.tokenVersion}`
  // );
  if (user.tokenVersion !== payload.v) {
    // If user has forgotten password/changed password or for some reason decides to invalidate existing sessions,
    // this is how it is done:
    // By incrementing tokenVersion, all existing sessions bound to a 'previous' version are now invalid
    return res.send({
      ok: false,
      accessToken: "",
      error: "refreshToken expired, please login again!",
    });
  }

  // update refreshToken as well
  const refreshToken = await createRefreshToken(user);
  sendRefreshToken(res, refreshToken);

  return res.send({ ok: true, accessToken: await createAccessToken(user) });
};

/**
 * call jsonwebtoken.verify, then verify existense of userId in payload
 * @param token accessToken
 */
export const getJwtAccessPayload = (token: string): JwtAccessPayload => {
  try {
    const jwtPayload: any = verify(token, jwtAccessSecretKey);
    if (!jwtPayload || jwtPayload instanceof String) {
      throw new Error("Unknown token!");
    }
    if (!jwtPayload.userId) {
      throw new Error("Invalid token!");
    }
    return jwtPayload;
  } catch (error) {
    throw error; // forward error handling to caller
  }
};

/**
 * By incrementing tokenVersion, all existing sessions bound to a 'previous' version are now invalid
 * @param ctx
 * @returns Promise of type Boolean - true if increment on db tokenVersion  affected 1 row, false otherwise
 */
export const revokeRefreshTokens = async (ctx: GraphqlContext): Promise<Boolean> => {
  const result = await getConnection()
    .getRepository(User)
    .increment({ id: parseInt(ctx.payload!.userId, 10) }, "tokenVersion", 1);
  if (result.affected !== 1) {
    return false;
  }

  // In order to avoid loking up user on every isAuth request, increment context directly
  ctx.payload!.v = parseInt(ctx.payload!.v.toString(), 10) + 1;

  console.log(`revokeRefreshTokens - tokens revoked by incrementing tokenVersion.`);
  return true;
};

export const jwtAccessSecretKey = process.env.JWT_ACCESS_TOKEN_SECRET!;
export const jwtRefreshSecretKey = process.env.JWT_REFRESH_TOKEN_SECRET!;

// JSON Web Token secret value related to the server/domain. Used to validate requests
// this should be protected and kept in a .env file - like DB logins etc.
// export const jwtAccessSecretKey =
//   "hIoeVrjXoNF357s4s8Dh4hYpkgiueYkQalsMFP25WSLEQCvOIHt5SkwBxT71zJSOh3aXzbGUlnAESfi3aM6iRkvQNsXDpv8eQfkB" +
//   "3NBt354EfmJMnsLDJPNPgEWp9OVLxcCsb9yFWPAOiJIUzM4NCIsInR5cCI6IkpXVCJ9eyJ1c2VySWQiOjExLCJpYXQiOjE2Mzk1O" +
//   "DE5NDAsImV4cCI6MTYzOTU4Mjg0MH0zksImV4cCI6MTYzOTU4Mjg3OX0MiNDytAoS6GPRdj5Wgq7JDdtr5AT8fSE5GaNmw5v8h4r" +
//   "CEsJVSvrSGYh9Z7vCjDpjExLCJpYXQiOjE2Mzk1ODIwNDcsImV4cCI6MTYzOTU4Mjk0N30DQfQ01Z0bkWRBHcCYNlFTb0tagTZQ7" +
//   "qnTgUDppbRsHGZ9KR8VbXUJYfZl8z2hdPB54NP2RcVUt2ws82C8bNQ6aqeYZQtda652wlvFyDP3QV2BGuzNoVduFnZaYUy9wAefn" +
//   "0X2Ck7STBD6w8XISIjkqDM4cVCH1fGWyervRgtAEaKT77nyeC6NDG1B1gzOu6GXYrFZGtGgfBqaVx9uYDZonekE2LUED3B7lD40S" +
//   "YsNYi1f8bfa6eMJAcqw75Czc2YhKzg9uuTaItUKv3x28U4ygaz1lrN0lPKz3R2ipjXvQ297oPnTRYtBr7fHD5UvSMswJ9ZF3VnN2" +
//   "ldXo8i0eNEc4De8nGIwW1kPoad2GlMWrem563W0cZh8O2VuhoMwYqRr6UMaPhFtqmVmsoq3d5ng1yDF3URcgURJ9HE5rJ7Iv9sUW" +
//   "Ly5TVeih05MRBDzp5PUO11lcCgO7Rg4Z9rq5bzwFysRQiTHygxXAXNZrCMXDp6BkRKSeUX7fkk3A5d83kdke1y9dRR1SxXe6fEge" +
//   "YDc8BLVJQcn3TxbaEMyW58sp1YqlhD279JF9ROpdnNChIB3Cf4OWGibRYmoZzdG4VBSy5iQfWrdUCf7wehSeSwPGAxB6WwvRnwO2" +
//   "WebArTsiRd6L8Nbu0XA4XofB"; // 1024 random characters

// export const jwtRefreshSecretKey =
//   "3NBt354EfmJMnsLDJPNPgEWp9OVLxcCsb9yFWPAOiJIUzM4NCIsInR5cCI6IkpXVCJ9eyJ1c2VySWQiOjExLCJpYXQiOjE2Mzk1O" +
//   "hIoeVrjXoNF357s4s8Dh4hYpkgiueYkQalsMFP25WSLEQCvOIHt5SkwBxT71zJSOh3aXzbGUlnAESfi3aM6iRkvQNsXDpv8eQfkB" +
//   "DE5NDAsImV4cCI6MTYzOTU4Mjg0MH0zksImV4cCI6MTYzOTU4Mjg3OX0MiNDytAoS6GPRdj5Wgq7JDdtr5AT8fSE5GaNmw5v8h4r" +
//   "CEsJVSvrSGYh9Z7vCjDpjExLCJpYXQiOjE2Mzk1ODIwNDcsImV4cCI6MTYzOTU4Mjk0N30DQfQ01Z0bkWRBHcCYNlFTb0tagTZQ7" +
//   "qnTgUDppbRsHGZ9KR8VbXUJYfZl8z2hdPB54NP2RcVUt2ws82C8bNQ6aqeYZQtda652wlvFyDP3QV2BGuzNoVduFnZaYUy9wAefn" +
//   "0X2Ck7STBD6w8XISIjkqDM4cVCH1fGWyervRgtAEaKT77nyeC6NDG1B1gzOu6GXYrFZGtGgfBqaVx9uYDZonekE2LUED3B7lD40S" +
//   "YsNYi1f8bfa6eMJAcqw75Czc2YhKzg9uuTaItUKv3x28U4ygaz1lrN0lPKz3R2ipjXvQ297oPnTRYtBr7fHD5UvSMswJ9ZF3VnN2" +
//   "ldXo8i0eNEc4De8nGIwW1kPoad2GlMWrem563W0cZh8O2VuhoMwYqRr6UMaPhFtqmVmsoq3d5ng1yDF3URcgURJ9HE5rJ7Iv9sUW" +
//   "Ly5TVeih05MRBDzp5PUO11lcCgO7Rg4Z9rq5bzwFysRQiTHygxXAXNZrCMXDp6BkRKSeUX7fkk3A5d83kdke1y9dRR1SxXe6fEge" +
//   "YDc8BLVJQcn3TxbaEMyW58sp1YqlhD279JF9ROpdnNChIB3Cf4OWGibRYmoZzdG4VBSy5iQfWrdUCf7wehSeSwPGAxB6WwvRnwO2" +
//   "WebArTsiRd6L8Nbu0XA4XofB"; // 1024 random characters

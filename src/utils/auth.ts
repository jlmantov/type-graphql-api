import { Request, Response } from "express";
import jwt, { SignOptions, verify } from "jsonwebtoken";
import { getConnection } from "typeorm";
import { User } from "../entity/User";
import { GraphqlContext } from "./GraphqlContext";

export interface JwtAccessPayload {
  userId: string;
  v: number;
  iat: number;
  exp: number;
}

/**
 * Token is available as hidden Form field in 'Reset password' html, so timespan is very limited
 * @param user the user who attempts to login
 * @returns JWT accessToken
 */
export const resetPasswordToken = async (user: User) => {
  const accessPayload = { userId: user.id, v: user.tokenVersion }; // typesafety - could be: parseInt(user.id.toString())
  const accessOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "3m",
    algorithm: "HS384",
  };
  // console.log("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
  return await jwt.sign(accessPayload, process.env.JWT_ACCESS_TOKEN_SECRET!, accessOptions);
};

/**
 * Token paylod is readable (although Base64 encoded), name the parameters so nobody know what is going on...
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
 * Token paylod is readable (although Base64 encoded), name the parameters so nobody know what is going on...
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
 * @returns Promise of type boolean - true if increment on db tokenVersion  affected 1 row, false otherwise
 */
export const revokeRefreshTokens = async (ctx: GraphqlContext): Promise<boolean> => {
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


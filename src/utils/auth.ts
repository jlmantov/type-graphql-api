import { Request, Response } from "express";
import jwt, { SignOptions, verify } from "jsonwebtoken";
import { getConnection, Repository } from "typeorm";
import { GraphqlContext } from "../graphql/utils/GraphqlContext";
import { User } from "../orm/entity/User";
import HttpError from "./httpError";
import logger from "./middleware/winstonLogger";
// import logger from "./middleware/winstonLogger";

export interface JwtAccessPayload {
  bit: string; // userId
  ogj: number; // tokenVersion
  iat: number;
  exp: number;
}

export interface JwtRefreshPayload {
  kew: string; // userId
  tas: number; // tokenVersion
  iat: number;
  exp: number;
}

export interface JwtResetPayload {
  plf: string; // userId
  rnl: number; // tokenVersion
  iat: number;
  exp: number;
}

/**
 * Token is available as hidden Form field in 'Reset password' html, so timespan is very limited
 * @param user the user who attempts to login
 * @returns JWT accessToken
 */
export const createResetPasswordToken = async (user: User) => {
  // payload is different from accessToken - this way resetToken can't be used to access GraphQL
  const resetPayload = { plf: user.id, rnl: user.tokenVersion };
  const resetOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "5m",
    algorithm: "HS384",
  };
  // logger.debug("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
  return await jwt.sign(resetPayload, process.env.JWT_ACCESS_TOKEN_SECRET!, resetOptions);
};

/**
 * Token paylod is readable (although Base64 encoded), name the parameters so nobody know what is going on...
 * @param user the user who attempts to login
 * @returns JWT accessToken
 */
export const createAccessToken = async (user: User) => {
  const accessPayload = { bit: user.id, ogj: user.tokenVersion };
  const accessOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "15m",
    algorithm: "HS384",
  };
  // logger.debug("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
  return await jwt.sign(accessPayload, process.env.JWT_ACCESS_TOKEN_SECRET!, accessOptions);
};

/**
 * Token paylod is readable (although Base64 encoded), name the parameters so nobody know what is going on...
 * @param user the user who attempts to login
 * @returns JWT refreshToken
 */
export const createRefreshToken = async (user: User) => {
  const refreshPayload = { kew: user.id, tas: user.tokenVersion };
  const refreshOptions: SignOptions = {
    header: { alg: "HS384", typ: "JWT" },
    expiresIn: "7d",
    algorithm: "HS384",
  };
  // logger.debug("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");
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
  // logger.debug("refreshtoken req.cookies: ", req.cookies);
  // 1. npm start, 2. POST req w. cookie from Postman, 3. conlose.log verified content. Great, let's move on.
  const token = req.cookies.jid;
  if (!token) {
    res.clearCookie("jid");
    return res.status(400).send({ accessToken: "", error: "Access denied!" });
  }

  let payload: JwtRefreshPayload | null = null;
  const reqUsr = {
    id: 0,
    tokenVersion: -1,
  };
  try {
    payload = verify(token, process.env.JWT_REFRESH_TOKEN_SECRET!) as JwtRefreshPayload;
    reqUsr.id = parseInt(payload!.kew, 10);
    reqUsr.tokenVersion = payload.tas;
  } catch (error) {
    res.clearCookie("jid");
    logger.error(error.message, { label: "handleJwtRefreshTokenRequest", error }); // ex.: 'JsonWebTokenError: jwt expired!'
    // throw new HttpError(400, error.name, error.message);
    return res.status(400).send({ accessToken: "", error: error.message });
  }

  //  token is valid and we can return an accessToken
  const userRepo = getConnection().getRepository("User") as Repository<User>;
  const user = await userRepo.findOne({ id: reqUsr.id });
  if (!user) {
    // this should not really happen since userId comes from refreshToken - but then again... DB is down or whatever
    logger.error("System error, user not found!", { label: "handleJwtRefreshTokenRequest" });
    // throw new HttpError(400, "BadRequestError", "System error, user not found!");
    return res.status(400).send({ accessToken: "", error: "System error!" });
  }

  if (user.tokenVersion !== reqUsr.tokenVersion) {
    // If user has forgotten password/changed password or for some reason decides to invalidate existing sessions,
    // this is how it is done:
    // By incrementing tokenVersion, all existing sessions bound to a 'previous' version are now invalid
    res.clearCookie("jid");
    logger.error("refreshToken expired, please login again!", {label: "handleJwtRefreshTokenRequest" });
    // throw new HttpError(400, "BadRequestError", "refreshToken expired, please login again!");
    return res
      .status(400)
      .send({ accessToken: "", error: "refreshToken expired, please login again!" });
  }

  // update refreshToken as well
  const refreshToken = await createRefreshToken(user);
  sendRefreshToken(res, refreshToken);

  return res.status(200).send({ accessToken: await createAccessToken(user) });
};

/**
 * call jsonwebtoken.verify, then verify existense of userId in payload
 * @param token accessToken
 */
export const getJwtPayload = (token: string): JwtAccessPayload | JwtResetPayload => {
  try {
    const jwtPayload: any = verify(token, process.env.JWT_ACCESS_TOKEN_SECRET!);
    if (!jwtPayload) {
      throw new HttpError(401, "JsonWebTokenError", "Invalid token");
    }
    if (!(jwtPayload.bit || jwtPayload.plf)) {
      // one must be available (not both)
      throw new HttpError(401, "JsonWebTokenError", "Invalid token", new Error(JSON.stringify(jwtPayload)));
    }
    return jwtPayload;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error; // declared above
    } else {
      if ((error.name = "TokenExpiredError")) {
        throw new HttpError(403, "AuthorizationError", "Access expired, please login again", error);
      }
      throw new HttpError(401, "UnauthorizedError", "Expired or invalid input", error); // something caused by 'verify(...)'
    }
  }
};

/**
 * By incrementing tokenVersion, all existing sessions bound to a 'previous' version are now invalid
 * @param ctx
 * @returns Promise of type boolean - true if increment on db tokenVersion  affected 1 row, false otherwise
 */
export const revokeRefreshTokens = async (ctx: GraphqlContext): Promise<boolean> => {
  // By adding authentication as middleware, the authentication is performed before the query takes place.
  // since isAuth is going to throw an error if user is missing, we can access user directly from here
  const userRepo = getConnection().getRepository("User") as Repository<User>;
  const result = await userRepo.increment({ id: ctx.user!.id }, "tokenVersion", 1); // accessToken.bit = userId
  if (result.affected !== 1) {
    return false;
  }

  // In order to avoid loking up user on every isAuth request, increment context directly
  ctx.user!.tokenVersion += 1;
  ctx.res.clearCookie("jid");

  // logger.debug(`revokeRefreshTokens - tokens revoked by incrementing tokenVersion.`);
  return true;
};

import { NextFunction, Request, Response } from "express";
import { getConnection, Repository } from "typeorm";
import { User } from "../../orm/entity/User";
import { getJwtPayload, JwtAccessPayload } from "../auth";
import HttpError from "../httpError";
import logger from "./winstonLogger";

/**
 * The user is expected to include a request header called authorization formatted like this:
 * bearer dgfhhoj6l.... (token value)
 * @param context where request is available
 * @param next
 */
export const isAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authorization = req.headers["authorization"];

  try {
    if (!authorization) {
      // if the user didn't add the 'authorization' header, we know they're not authenticated
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
      throw new HttpError(401, "AuthorizationError", "Not authenticated"); // anonymous error, user might be looking for a vulnerabilities
    }
    const token = authorization.split(" ")[1];

    let payload: JwtAccessPayload | undefined = undefined;
    // accessPayload = { bit: user.id, ogj: user.tokenVersion };
    payload = getJwtPayload(token) as JwtAccessPayload; // verified attribute userId
    const reqUsr = {
      id: parseInt(payload.bit, 10),
      tokenVersion: payload.ogj,
    };

    if (!reqUsr.id || reqUsr.tokenVersion < 0) {
      logger.error("Invalid token payload: ", payload); // log token verification error
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403
      throw new HttpError(403, "AuthorizationError", "Access expired, please login again"); // anonymous error, user might be looking for a vulnerabilities
    }

    const userRepo = getConnection().getRepository("User") as Repository<User>;
    userRepo.findOne(reqUsr.id).then((usr) => {
      if (usr) {
        if (usr.tokenVersion !== reqUsr!.tokenVersion) {
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403
          throw new HttpError(403, "AuthorizationError", "Access expired, please login again");
        }
      } else {
        // did network, DB or something else fail? - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
        throw new HttpError(500, "InternalServerError", "User validation failed");
      }
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error; // error already handled
    }

    switch (error.name) {
      case "JsonWebTokenError":
        // 'isAuth: JsonWebTokenError - <token> malformed!'
        // 'isAuth: JsonWebTokenError - invalid signature!'
        throw new HttpError(400, error.name, error.message, error);
      case "TokenExpiredError":
        // 'isAuth: TokenExpiredError - jwt expired!'
        // throw new HttpException(403, error.name, error.message);
        throw new HttpError(403, "AuthorizationError", "Access expired, please login again", error);
      default:
        throw new HttpError(500, error.name, error.message, error);
    }
  }
  next();
};

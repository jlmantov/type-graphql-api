import { NextFunction, Request, Response } from "express";
import { getConnection } from "typeorm";
import { User } from "../../orm/entity/User";
import { getJwtPayload, JwtAccessPayload } from "../auth";
import HttpError from "../httpError";

/**
 * The user is expected to include a request header called authorization formatted like this:
 * bearer dgfhhoj6l.... (token value)
 * @param context where request is available
 * @param next
 */
export const isAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authorization = req.headers["authorization"];

  if (!authorization) {
    // if the user didn't add the 'authorization' header, we know they're not authenticated
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
    throw new HttpError(401, "AuthorizationError", "Not authenticated"); // anonymous error, user might be looking for a vulnerabilities
  }

  try {
    const token = authorization.split(" ")[1];
    let payload: JwtAccessPayload | undefined = undefined;
    // accessPayload = { bit: user.id, ogj: user.tokenVersion };
    payload = getJwtPayload(token) as JwtAccessPayload; // verified attribute userId
    const reqUsr = {
      id: parseInt(payload.bit, 10),
      tokenVersion: payload.ogj,
    };
    if (!reqUsr.id || reqUsr.tokenVersion < 0) {
      // console.log("Invalid token payload: ", payload); // log token verification error
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403
      throw new HttpError(403, "AuthorizationError", "Access expired, please login again"); // anonymous error, user might be looking for a vulnerabilities
    }

    getConnection().getRepository(User).findOne(reqUsr.id).then((usr) => {
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
    // console.log("isAuth: " + error.name + " - " + error.message);

    if (error instanceof HttpError) {
      throw error; // error already handled
    }
    switch (error.name) {
      case "JsonWebTokenError":
        // 'isAuth: JsonWebTokenError - <token> malformed!'
        // 'isAuth: JsonWebTokenError - invalid signature!'
        throw new HttpError(400, error.name, error.message);
      case "TokenExpiredError":
        // 'isAuth: TokenExpiredError - jwt expired!'
        // throw new HttpException(403, error.name, error.message);
        throw new HttpError(403, "AuthorizationError", "Access expired, please login again");
      default:
        throw new HttpError(500, error.name, error.message);
    }
  }

  next();
};

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
  const authorization = req.headers["authorization"]; // missing 'authorization' header <=> not authenticated

  try {
    if (authorization === undefined || authorization === "") {
      throw new HttpError(401, "AuthorizationError", "Expired or invalid input", { isAuth: "No authorization header" }); // anonymous error, user might be looking for a vulnerabilities
    }
    const token = authorization!.split(" ")[1];
    logger.debug(" -- isAuth --> authorization header OK => getJwtPayload");

    let payload: JwtAccessPayload | undefined = undefined; // accessPayload = { bit: user.id, ogj: user.tokenVersion };
    payload = getJwtPayload(token) as JwtAccessPayload; // verified attribute userId
    logger.debug(` -- isAuth --> getJwtPayload`, payload);
    const reqUsr = {
      id: parseInt(payload.bit, 10),
      tokenVersion: payload.ogj,
    };
    logger.debug(` -- isAuth --> reqUsr`, reqUsr);

    if (reqUsr.id === 0 || reqUsr.tokenVersion === undefined) {
      throw new HttpError(401, "AuthorizationError", "Expired or invalid input", { isAuth: "jwt payload invalid" }); // anonymous error, user might be looking for a vulnerabilities
    }

    const userRepo = getConnection().getRepository("User") as Repository<User>;
    userRepo.findOne(reqUsr.id).then((usr) => {
      if (usr) {
        logger.debug(` -- isAuth --> DB lookup, User.id ${reqUsr.id}`, usr);
        if (usr.tokenVersion !== reqUsr!.tokenVersion) {
          const err = new HttpError(403, "AuthorizationError", "Access expired, please login again", { isAuth: "wrong tokenVersion" });
          next(err);
        }
      } else {
        const err = new HttpError(500, "InternalServerError", "User validation failed", { isAuth: `User.id ${reqUsr.id} not found` });
        next(err);
      }
      next(); // success
    }).catch((error) => {
      const err = new HttpError(500, "InternalServerError", `User validation ERROR, User.id ${reqUsr.id}`, {label: "isAuth", error});
      next(err);
    });

  } catch (error) {
    // logger.debug(` -- isAuth --> ERROR${error.status !== undefined ? ", HttpError " + error.status : ""}:`, error);
    switch (error.name) {
      case "AuthorizationError":
      case "InternalServerError":
        // logger.debug(" -- isAuth --> ERROR",{ label: "isAuth", error });
        throw error; // error already HttpError (logged)
      case "JsonWebTokenError":
        // 'isAuth: JsonWebTokenError - <token> malformed!'
        // 'isAuth: JsonWebTokenError - invalid signature!'
        throw new HttpError(401, "AuthorizationError", "Expired or invalid input", {label: "isAuth.catch", error});
      case "TokenExpiredError":
        // 'isAuth: TokenExpiredError - jwt expired!'
        throw new HttpError(403, "AuthorizationError", "Access expired, please login again", {label: "isAuth.catch", error});
      default:
        throw new HttpError(500, "InternalServerError", "Something went wrong", {label: "isAuth.catch", error});
    }
  }
};

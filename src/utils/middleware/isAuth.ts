import { NextFunction, Request, Response } from "express";
import { User } from "../../orm/entity/User";
import { getJwtPayload, JwtAccessPayload } from "../auth";

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
    throw new Error("Not authenticated");
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
      console.log("Invalid token payload: ", payload); // log token verification error
      throw new Error("Access expired, please login again!"); // anonymous error, user might be looking for a vulnerabilities
    }

    User.findOne(reqUsr.id).then((usr) => {
      if (usr) {
        if (usr.tokenVersion !== reqUsr!.tokenVersion) {
          throw new Error("Access expired, please login again!");
        }
      } else {
        throw new Error("Unable to verify user!");
      }
    });
  } catch (error) {
    // 'isAuth: TokenExpiredError - jwt expired!'
    // 'isAuth: JsonWebTokenError - <token> malformed!'
    // 'isAuth: JsonWebTokenError - invalid signature!'
    console.log("isAuth: " + error.name + " - " + error.message);
    throw error;
  }

  next();
};

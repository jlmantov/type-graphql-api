import { MiddlewareFn } from "type-graphql";
import { getConnection, Repository } from "typeorm";
import { User } from "../../../orm/entity/User";
import { getJwtPayload, JwtAccessPayload } from "../../../utils/auth";
import HttpError from "../../../utils/httpError";
import { GraphqlContext } from "../GraphqlContext";

/**
 * The user is expected to include a request header called authorization formatted like this:
 * bearer dgfhhoj6l.... (token value)
 *
 * action: ResolverData
 *  - root: any,
 *  - args: ArgsDictionary,
 *  - context: ContextType,
 *  - info: GraphQLResolveInfo
 *
 * @param context where request is available
 * @param next
 */
export const isAuthGql: MiddlewareFn<GraphqlContext> = async ({ context }, next) => {
  const authorization = context.req.headers["authorization"];

  if (!authorization) {
    //   if the user didn't add the 'authorization' header, we know they're not authenticated
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
    throw new HttpError(401, "AuthorizationError", "Not authenticated", { label: "isAuthGql" }); // anonymous error, user might be looking for a vulnerabilities
  }

  try {
    const token = authorization.split(" ")[1];
    let payload: JwtAccessPayload | undefined = undefined;
    try {
      // accessPayload = { bit: user.id, ogj: user.tokenVersion };
      payload = getJwtPayload(token) as JwtAccessPayload; // verified attribute userId
      // make payload available inside resolver by adding it to the context
      context.user = {
        id: parseInt(payload.bit, 10),
        tokenVersion: payload.ogj,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error; // error alread handled
      } else {
        throw new HttpError(403, "AuthorizationError", "Access expired, please login again", { label: "isAuthGql", error });
      }
    }

    const userRepo = getConnection().getRepository("User") as Repository<User>;
    const user = await userRepo.findOne(context.user.id);
    if (!user) {
      // did network, DB or something else fail? - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
      throw new HttpError(500, "InternalServerError", "User validation failed", { label: "isAuthGql" });
    }
    if (user.tokenVersion !== context.user.tokenVersion) {
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403
      throw new HttpError(403, "AuthorizationError", "Access expired, please login again", { label: "isAuthGql" });
    }
  } catch (error) {
    // logger.debug("isAuth: " + error.name + " - " + error.message);
    if (error instanceof HttpError) {
      throw error; // error already handled
    }
    switch (error.name) {
      case "JsonWebTokenError":
        // 'isAuth: JsonWebTokenError - <token> malformed!'
        // 'isAuth: JsonWebTokenError - invalid signature!'
        throw new HttpError(400, "BadRequestError", "Expired or invalid input", { label: "isAuthGql", error });
      case "TokenExpiredError":
        // 'isAuth: TokenExpiredError - jwt expired!'
        throw new HttpError(403, "AuthorizationError", "Access expired, please login again", { label: "isAuthGql", error });
      default:
        throw new HttpError(500, "InternalServerError", "Something went wrong", { label: "isAuthGql", error });
    }
  }

  return next();
};

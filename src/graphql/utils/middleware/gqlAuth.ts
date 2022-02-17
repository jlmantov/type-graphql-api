import {
  ApolloError,
  AuthenticationError,
  ForbiddenError,
  UserInputError
} from "apollo-server-express";
import { MiddlewareFn } from "type-graphql";
import { getConnection, Repository } from "typeorm";
import { User } from "../../../orm/entity/User";
import { getJwtPayload, JwtAccessPayload } from "../../../utils/auth";
import logger from "../../../utils/middleware/winstonLogger";
import { GraphqlContext } from "../GraphqlContext";

/**
 * TypeGraphQL middleware (not express) - https://typegraphql.com/docs/middlewares.html
 *
 * isAuthGql tests if authorization request header is available.
 * Response is altered by altering the context.
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
  const authorization = context.req.headers.authorization;
  // logger.debug(` -- gqlAuth --> context.req`, context.req);
  logger.debug(` -- gqlAuth --> context.req.headers`, context.req.headers);
  // logger.debug(` -- gqlAuth --> context.res`, context.res);
  logger.debug(` -- gqlAuth --> authorization: ${authorization}`);

  try {
    if (authorization === undefined || authorization === "") {
      throw graphqlError(401, "AuthorizationError", "Not authenticated", { gqlAuth: "No authorization header" }); // anonymous error, user might be looking for a vulnerabilities
    }
    const token = authorization!.split(" ")[1];
    logger.silly(" -- gqlAuth --> authorization header OK => getJwtPayload: " + token);

    let payload: JwtAccessPayload | undefined = undefined;
    // accessPayload = { bit: user.id, ogj: user.tokenVersion };
    payload = getJwtPayload(token) as JwtAccessPayload; // verified attribute userId
    // make payload available inside resolver by adding it to the context
    context.user = {
      id: parseInt(payload.bit, 10),
      tokenVersion: payload.ogj,
    };
    logger.debug(` -- gqlAuth --> context.user`, context.user);

    if (context.user.id === 0 || context.user.tokenVersion === undefined) {
      throw graphqlError(401, "AuthorizationError", "Expired or invalid input", {
        gqlAuth: "jwt payload invalid",
      }); // anonymous error, user might be looking for a vulnerabilities
    }

    const userRepo = getConnection().getRepository("User") as Repository<User>;
    const user = await userRepo.findOne(context.user.id);
    if (user) {
      logger.debug(` -- gqlAuth --> DB lookup, User.id ${context.user.id}`, user);
      if (user.tokenVersion !== context.user.tokenVersion) {
        throw graphqlError(403, "AuthorizationError", "Access expired, please login again", {
          gqlAuth: "wrong tokenVersion",
        });
      }
      logger.debug(` -- gqlAuth --> User.id ${user.id} OK, next()`);
      try {
        return await next(); // preconditions OK, execute resolver - catch any errors
      } catch (error) {
        //
        logger.debug(" -- gqlAuth --> next() ERROR", error);
      }

      // next(); // TypeGraphQL middleware (not express) - https://typegraphql.com/docs/middlewares.html
    } else {
      // did network, DB or something else fail? - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
      throw graphqlError(500, "InternalServerError", "User validation failed", {
        gqlAuth: `User.id ${context.user.id} not found`,
      });
    }
  } catch (error) {
    // logger.debug(` -- gqlAuth --> ERROR${error.status !== undefined ? ", HttpError " + error.status : ""}:`, error);
    switch (error.name) {
      case "AuthenticationError":
      case "ForbiddenError":
        throw error; // handled by graphqlError(...)
        break;
      case "AuthorizationError":
      case "InternalServerError":
        logger.debug(" -- gqlAuth --> ERROR", { gqlAuth: "catch", error });
        throw graphqlError(error.status, "AuthenticationError", error.message, {
          gqlAuth: "catch",
          error,
        });
        break;
      case "JsonWebTokenError":
        // 'gqlAuth: JsonWebTokenError - <token> malformed!'
        // 'gqlAuth: JsonWebTokenError - invalid signature!'
        throw graphqlError(401, "AuthorizationError", "Expired or invalid input", {
          gqlAuth: "catch",
          error,
        });
        break;
      case "TokenExpiredError":
        // 'gqlAuth: TokenExpiredError - jwt expired!'
        throw graphqlError(403, "AuthorizationError", "Access expired, please login again", {
          gqlAuth: "catch",
          error,
        });
        break;
      default:
        throw graphqlError(500, "InternalServerError", "Something went wrong", {
          gqlAuth: "catch",
          error,
        });
    }
  }
};

/**
 * equivalent to HttpError
 */
function graphqlError(status: number, name: string, message: string, suberror?: any): ApolloError {
  let apolloError = undefined;
  const metadata: { label: string; status: number; name: string; cause?: any } = {
    label: "graphqlError",
    status,
    name,
    cause: suberror,
  };
  logger.error(message, { metadata }); // 2. param is logged as metadata: { label: "HttpError", status, name, message, error }
  switch (status) {
    case 400:
      apolloError = new UserInputError(message); // this is a more general error - allow message to slip through
      break;
    case 401:
      apolloError = new AuthenticationError("Expired or invalid input");
      break;
    case 403:
      apolloError = new ForbiddenError("Access expired, please login again");
      break;
    case 500:
    default:
      apolloError = new ApolloError("Something went wrong"); // InternalServerError - https://www.apollographql.com/docs/apollo-server/data/errors/#internal_server_error
      break;
  }
  return apolloError;
}

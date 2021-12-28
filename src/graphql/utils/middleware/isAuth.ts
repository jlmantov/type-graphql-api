import { MiddlewareFn } from "type-graphql";
import { User } from "../../../orm/entity/User";
import { getJwtPayload, JwtAccessPayload } from "../../../utils/auth";
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
    throw new Error("Not authenticated");
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
      throw error; // propagate possible token verification error from 'deeper layers'
    }

    const user = await User.findOne(context.user.id);
    if (!user) {
      throw new Error("Unable to verify user!");
    }
    if (user.tokenVersion !== context.user.tokenVersion) {
      throw new Error("Access expired, please login again!");
    }
  } catch (error) {
    // 'isAuth: TokenExpiredError - jwt expired!'
    // 'isAuth: JsonWebTokenError - <token> malformed!'
    // 'isAuth: JsonWebTokenError - invalid signature!'
    throw error;
  }

  return next();
};

import { MiddlewareFn } from "type-graphql";
import { User } from "../entity/User";
import { getJwtAccessPayload, JwtAccessPayload } from "./auth";
import { GraphqlContext } from "./GraphqlContext";

/**
 * The user is expected to include a request header called authorization formatted like this:
 * bearer dgfhhoj6l.... (token value)
 * @param context where request is available
 * @param next
 */
export const isAuth: MiddlewareFn<GraphqlContext> = async ({ context }, next) => {
  const authorization = context.req.headers["authorization"];

  if (!authorization) {
    //   if the user didn't add the 'authorization' header, we know they're not authenticated
    throw new Error("Not authenticated");
  }

  try {
    const token = authorization.split(" ")[1];
    const payload: JwtAccessPayload = getJwtAccessPayload(token); // verified attribute userId
    console.log("isAuth payload", JSON.stringify(payload));

    const user = await User.findOne(payload.userId);
    if (!user) {
      throw new Error('Unable to verify user!');
    }
    if (user.tokenVersion !== payload.v) {
      // console.log(`isAuth: payload.tokenVersion=${payload.v}, DB tokenVersion=${user.tokenVersion}`);
      throw new Error("Access expired, please login again!");
    }

    // make payload available inside resolver by adding it to the context
    context.payload = payload;
  } catch (error) {
    // 'isAuth: TokenExpiredError - jwt expired!'
    // 'isAuth: JsonWebTokenError - <token> malformed!'
    // 'isAuth: JsonWebTokenError - invalid signature!'
    console.error("isAuth: " + error.name + " - " + error.message + "!");
    throw error;
  }

  return next();
};

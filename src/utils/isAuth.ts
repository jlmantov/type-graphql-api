import { MiddlewareFn } from "type-graphql";
import { getJwtAccessPayload, JwtAccessPayload } from "./auth";
import { GraphqlContext } from "./GraphqlContext";

/**
 * The user is expected to include a request header called authorization formatted like this:
 * bearer dgfhhoj6l.... (token value)
 * @param context where request is available
 * @param next
 */
export const isAuth: MiddlewareFn<GraphqlContext> = ({ context }, next) => {
  const authorization = context.req.headers["authorization"];

  if (!authorization) {
    //   if the user didn't add the 'authorization' header, we know they're not authenticated
    throw new Error("Not authenticated");
  }

  try {
    const token = authorization.split(" ")[1];
    const payload: JwtAccessPayload = getJwtAccessPayload(token); // verified attribute userId

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

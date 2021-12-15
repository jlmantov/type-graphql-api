import { JsonWebTokenError, TokenExpiredError, verify } from "jsonwebtoken";
import { MiddlewareFn } from "type-graphql";
import { jwtAccessSecretKey } from "./auth";
import { GraphqlContext } from "./GraphqlContext";

/**
 * The user is expected to include a header called authorization formatted like this:
 * bearer dgfhhoj6l.... (token value)
 * @param param0
 * @param next
 * @returns
 */
export const isAuth: MiddlewareFn<GraphqlContext> = ({ context }, next) => {
  const authorization = context.req.headers["authorization"];

  if (!authorization) {
    //   if the user didn't add the 'authorization' header, we know they're not authenticated
    throw new Error("Not authenticated");
  }

  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, jwtAccessSecretKey);

    // make payload available inside resolver by placing adding it to the context
    context.payload = payload as any; // string or object
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      // old authorization header (access token) for testing purposes:
      // "authorization":"bearer eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjExLCJpYXQiOjE2Mzk1OTgyMTIsImV4cCI6MTYzOTU5OTExMn0.e1nMOdHbR4K74QTCQMlw6NWq6HP49G8u6ayM5ebBngRzTLOY65eMfLwRnV0Fl2AC"
      console.error("isAuth: " + error.message + "!"); // 'jwt expired!'
    }
    if (error instanceof JsonWebTokenError) {
      console.error("isAuth: " + error.message + "!"); // '<token> malformed', 'invalid signature!' etc.
    }
    throw error;
  }

  return next();
};

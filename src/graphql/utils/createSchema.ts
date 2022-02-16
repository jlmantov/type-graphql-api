import { buildSchema } from "type-graphql";
import { IsAliveResolver } from "../modules/IsAlive.resolver";
import { LoginResolver } from "../modules/user/Login.resolver";
import { RegisterResolver } from "../modules/user/Register.resolver";
import { ResetPasswordResolver } from "../modules/user/ResetPassword.resolver";
import { UserResolver } from "../modules/user/User.playground.resolver";

/**
 * used for both testing and production
 * Creating this function that simply returns schema, eliminates authChecker duplicate logic
 * @returns graphql schema
 */
export const createSchema = () =>
  buildSchema({
    resolvers: [
      IsAliveResolver,
      LoginResolver,
      RegisterResolver,
      ResetPasswordResolver,
      UserResolver,
    ],
  });

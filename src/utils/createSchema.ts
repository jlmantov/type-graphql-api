import { buildSchema } from "type-graphql";
import { LoginResolver } from "../modules/user/Login.resolver";
import { RegisterResolver } from "../modules/user/Register.resolver";
import { UserResolver } from "../modules/user/User.resolver";

/**
 * used for both testing and production
 * Creating this function that simply returns schema, eliminates authChecker duplicate logic
 * @returns graphql schema
 */
export const createSchema = () =>
  buildSchema({
    resolvers: [UserResolver, LoginResolver, RegisterResolver],
  });

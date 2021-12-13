import { buildSchema } from "type-graphql";
import { UserResolver } from "../modules/user/UserResolver";

/**
 * used for both testing and production
 * Creating this function that simply returns schema, eliminates authChecker duplicate logic
 * @returns graphql schema
 */
export const createSchema = () =>
  buildSchema({
    resolvers: [
		 UserResolver,
	],
  });

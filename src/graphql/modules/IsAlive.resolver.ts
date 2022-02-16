import "reflect-metadata";
import { Query, Resolver } from "type-graphql";

/**
 * IsAlive returns a UTC timestamp
 * https://typegraphql.com/docs/resolvers.html#resolver-classes
 */
@Resolver()
export class IsAliveResolver {
  @Query(() => Number) // Tell type-graphql that return value is of type Number
  async isAlive() {
    const utcTimestamp = new Date().getTime();
    return utcTimestamp;
  }
}

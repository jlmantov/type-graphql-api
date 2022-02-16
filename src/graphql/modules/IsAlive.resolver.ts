import "reflect-metadata";
import { Query, Resolver } from "type-graphql";

@Resolver()
export class IsAliveResolver {
  @Query(() => Number) // Tell type-graphql that return value is of type Number
  isAlive() {
    const utcTimestamp = new Date().getTime();
    return utcTimestamp;
  }
}

import { Query, Resolver } from "type-graphql";

@Resolver()
export class UserResolver {
  @Query(() => String) // Tell type-graphql that return value of this query is of type String
  hello() {
    return "hi!";
  }
}

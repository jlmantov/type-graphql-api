import { Arg, Ctx, Field, ObjectType, Query, Resolver } from "type-graphql";
import { User } from "../../entity/User";
import { createAccessToken, createRefreshToken, sendRefreshToken } from "../../utils/auth";
import { verify } from "../../utils/crypto";
import { GraphqlContext } from "../../utils/GraphqlContext";

/**
 * login returns a token in GraphQL, so we need to let TypeGraphQL know about it - so it becomes an @ObjectType
 */
@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}

@Resolver()
export class LoginResolver {
  @Query(() => LoginResponse) // Tell type-graphql that return value is of type LoginResponse
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() ctx: GraphqlContext
  ): Promise<LoginResponse> {
    // tell TypeScript that login returns a promise of type LoginResponse
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error("Invalid email or password!");
    }

    const validated = await verify(password, user.password);
    if (!validated) {
      throw new Error("Invalid username or password!");
    }

    if (!user.confirmed) {
      throw new Error("Email needs to be confirmed in order to enable login!");
    }

    // login successful, no create 1. refresh token and 2. access token
    const refreshToken = await createRefreshToken(user);
    sendRefreshToken(ctx.res, refreshToken);

    // now create a JSON Web Token - https://www.npmjs.com/package/jsonwebtoken
    const accessToken = await createAccessToken(user);
    return {
      accessToken,
    };
  }
}

import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware
} from "type-graphql";
import { User } from "../../entity/User";
import { createAccessToken, createRefreshToken, sendRefreshToken } from "../../utils/auth";
import { hash, verify } from "../../utils/crypto";
import { GraphqlContext } from "../../utils/GraphqlContext";
import { isAuth } from "../../utils/isAuth";

/**
 * login returns a token in GraphQL, so we need to let TypeGraphQL know about it - so it becomes an @ObjectType
 */
@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}

@Resolver()
export class UserResolver {
  @Query(() => [User]) // Tell type-graphql that return value is an array of type User
  @UseMiddleware(isAuth)
  users(): Promise<User[]> {
    // tell TypeScript that users returns a promise with an array of type User
    return User.find();
  }

  @Query(() => User) // Tell type-graphql that return value is of type User
  async getUser(
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<User | null> {
    // tell TypeScript that getUser returns a promise of type User or null
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    const validated = await verify(password, user.password);
    if (!validated) {
      return null;
    }
    // notice, that even though user contains both salt and password, those fields are kept private
    return user;
  }

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

    // login successful, no create 1. refresh token and 2. access token
    const refreshToken = await createRefreshToken(user);
    sendRefreshToken(ctx.res, refreshToken);

    // now create a JSON Web Token - https://www.npmjs.com/package/jsonwebtoken
    const accessToken = await createAccessToken(user);
    return {
      accessToken,
    };
  }

  @Query(() => String) // Tell type-graphql that return value is of type String
  @UseMiddleware(isAuth)
  isAuthenticated(@Ctx() { payload }: GraphqlContext): String {
    // tell TypeScript that isAuthenticated returns a String

    // By adding authentication as middleware, the authentication is performed before the query takes place.
    // since isAuth is going to throw an error if payload is missing, we can access payload directly from here
    console.log(`isAuthenticated: userId ${payload!.userId} is authenticated!`);
    return `userId ${payload!.userId} is authenticated!`;
  }

  @Mutation(() => User) // Tell type-graphql that return value is of type User
  async register(
    @Arg("firstname") firstName: string,
    @Arg("lastname") lastName: string,
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<User | null> {
    // tell TypeScript that getUser returns a promise of type User or null

    // first of all, find out if email is already in the database
    const registeredUser = await User.findOne({ where: { email } });
    // console.log("registeredUser", registeredUser);
    if (registeredUser) {
      throw new Error("Error: user already exist!"); // avoid duplicates
    }

    // encrypt the password (keep it a secret)
    const hashedPassword = await hash(password);
    // console.log("hashedPassword", hashedPassword);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    }).save();

    if (!user) {
      throw new Error("Error: unable to create user!"); // some unhandled error - net, connection, DB, disc whatever ...
    }

    return user;
  }
}

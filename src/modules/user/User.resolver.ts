import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { getConnection } from "typeorm";
import { User } from "../../entity/User";
import { UserEmail } from "../../entity/UserEmail";
import { revokeRefreshTokens } from "../../utils/auth";
import { verify } from "../../utils/crypto";
import { GraphqlContext } from "../../utils/GraphqlContext";
import { isAuth } from "../../utils/isAuth";

@Resolver()
export class UserResolver {
  /**
   * Temporarily keep this - for manual testing purposes
   * @returns
   */
  @Query(() => [User]) // Tell type-graphql that return value is an array of type User
  @UseMiddleware(isAuth)
  users(): Promise<User[]> {
    // tell TypeScript that users returns a promise with an array of type User
    return User.find();
  }

  /**
   * Temporarily keep this - for manual testing purposes
   * @param email
   * @param password
   * @returns
   */
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

  /**
   * Temporarily keep this - for manual testing purposes
   * @param param0
   * @returns
   */
  @Query(() => String) // Tell type-graphql that return value is of type String
  @UseMiddleware(isAuth)
  isAuthenticated(@Ctx() { payload }: GraphqlContext): String {
    // tell TypeScript that isAuthenticated returns a String

    // By adding authentication as middleware, the authentication is performed before the query takes place.
    // since isAuth is going to throw an error if payload is missing, we can access payload directly from here
    console.log(`isAuthenticated: userId ${payload!.userId} is authenticated!`);
    return `userId ${payload!.userId} is authenticated!`;
  }

  /**
   * Invalidate refreshTokens <=> invalidate current sessions ... relevant for resetting/changing password
   * This should be refactored into two different mutations: resetPassword (using email) AND changePassword
   * @param ctx
   * @returns
   */
  @Mutation(() => Boolean) // Tell type-graphql that return value is of type Boolean
  @UseMiddleware(isAuth)
  async revokeTokens(@Ctx() ctx: GraphqlContext) {
    // By adding authentication as middleware, the authentication is performed before the query takes place.
    // since isAuth is going to throw an error if payload is missing, we can access payload directly from here
    return await revokeRefreshTokens(ctx);
  }

  /**
   * Temporarily keep this - for manual testing purposes
   * @param uuid
   * @returns
   */
  @Mutation(() => Boolean) // Tell type-graphql that return value is of type Boolean
  async confirmEmail(@Arg("uuid") uuid: string): Promise<boolean> {
    // tell TypeScript that confirmEmail returns a promise of type boolean

    const userConfirmation = await UserEmail.findOne({ where: { uuid } });
    console.log("userConfirmation", userConfirmation);
    if (userConfirmation === undefined) {
      return false;
    }

    const user = await User.findOne({ where: { email: userConfirmation.email } });
    console.log("user", user);
    if (!user) {
      return false;
    }

    const success = await User.update(user.id, { confirmed: true });
    if (success.affected === 1) {
      // only cleanup if user login was actually enabled
      UserEmail.delete(userConfirmation.id);
    }
    return true;
  }

  @Mutation(() => Boolean) // Tell type-graphql that return value is of type Boolean
  async userEmailCleanup(): Promise<boolean> {
    // tell TypeScript that unconfirmedUserCleanup returns a promise of type boolean

    let timeout = new Date().getTime(); // current timestamp - ms since '01-01-1970 00:00:00.000 UTC'
    timeout = timeout - 1000 * 60 * 60 * 24 * 2; // two days: 1000 ms * 60 s * 60 m * 24 h * 2 days
    timeout = Math.floor(timeout / 1000); // mysql requires timestamp in seconds

    // https://typeorm.io/#select-query-builder/how-to-create-and-use-a-querybuilder
    const userEmails: UserEmail[] = await getConnection()
      .createQueryBuilder()
      .select(["id", "email", "uuid", "createdAt"])
      .from(UserEmail, "UserEmails")
      .where("createdAt < FROM_UNIXTIME(:timeout)", { timeout: timeout })
      .execute();

    if (userEmails === undefined || userEmails.length === 0) {
      return false;
    }

    userEmails.map(async (outdated: UserEmail) => {
      // cleanup table Users
      const user = await User.findOne({ where: { email: outdated.email, confirmed: false } });
      if (user) {
        User.delete(user.id);
      }

      // cleanup table UserEmails
      UserEmail.delete(outdated.id);
    });

    return true;
  }
}

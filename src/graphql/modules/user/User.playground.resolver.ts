import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { getConnection, Repository } from "typeorm";
import { User } from "../../../orm/entity/User";
import { UserEmail } from "../../../orm/entity/UserEmail";
import { revokeRefreshTokens } from "../../../utils/auth";
import { verifyPwd } from "../../../utils/crypto";
import HttpError from "../../../utils/httpError";
import { GraphqlContext } from "../../utils/GraphqlContext";
import { isAuthGql } from "../../utils/middleware/gqlAuth";
// import logger from "../../../utils/middleware/winstonLogger";

@Resolver()
export class UserResolver {
  /**
   * Temporarily keep this - for manual testing purposes
   * @returns
   */
  @Query(() => [User]) // Tell type-graphql that return value is an array of type User
  @UseMiddleware(isAuthGql)
  users(): Promise<User[]> {
    // tell TypeScript that users returns a promise with an array of type User
    const userRepo = getConnection().getRepository("User") as Repository<User>;
    return userRepo.find();
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
    const userRepo = getConnection().getRepository("User") as Repository<User>;
    const user = await userRepo.findOne({
      where: { email },
    });
    if (!user) {
      throw new HttpError(204, "RequestError", "No Content", { label: "gql/getUser" });
    }

    // const validated = await verifyPwd(password, user.password);
    let validated = false;
    try {
      validated = await verifyPwd(password, user.password);
    } catch (error) {
      throw new HttpError(400, "BadRequestError", "Request input not valid", { label: "gql/getUser" }); // anonymous error, user might be looking for a vulnerabilities
    }
    if (!validated) {
      throw new HttpError(400, "BadRequestError", "Request input not valid", { label: "gql/getUser" }); // anonymous error, user might be looking for a vulnerabilities
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
  @UseMiddleware(isAuthGql)
  isAuthenticated(@Ctx() { user }: GraphqlContext): String {
    // tell TypeScript that isAuthenticated returns a String

    // By adding authentication as middleware, the authentication is performed before the query takes place.
    // since isAuth is going to throw an error if user is missing, we can access user directly from here
    // logger.debug(`isAuthenticated: userId ${user!.id} is authenticated!`);
    return `userId ${user!.id} is authenticated!`;
  }

  /**
   * Invalidate refreshTokens <=> invalidate current sessions ... relevant for resetting/changing password
   * This should be refactored into two different mutations: resetPassword (using email) AND changePassword
   * @param ctx
   * @returns
   */
  @Mutation(() => Boolean) // Tell type-graphql that return value is of type Boolean
  @UseMiddleware(isAuthGql)
  async revokeTokens(@Ctx() ctx: GraphqlContext) {
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

    const userRepo = getConnection().getRepository("User") as Repository<User>;
    const emailRepo = getConnection().getRepository("UserEmail") as Repository<UserEmail>;
    const userConfirmation = await emailRepo.findOne({ where: { uuid } });
    // logger.debug("userConfirmation", userConfirmation);
    if (userConfirmation === undefined) {
      return false;
    }

    const user = await userRepo.findOne({ where: { email: userConfirmation.email } });
    // logger.debug("user", user);
    if (!user) {
      return false;
    }

    const success = await userRepo.update(user.id, { confirmed: true });
    if (success.affected === 1) {
      // only cleanup if user login was actually enabled
      await emailRepo.delete(userConfirmation.id);
    }
    return true;
  }

  @Mutation(() => Boolean) // Tell type-graphql that return value is of type Boolean
  async userEmailCleanup(): Promise<boolean> {
    // tell TypeScript that userEmailCleanup returns a promise of type boolean

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
      const userRepo = getConnection().getRepository("User") as Repository<User>;
      const user = await userRepo.findOne({ where: { email: outdated.email, confirmed: false } });
      if (user) {
        userRepo.delete(user.id);
      }

      // cleanup table UserEmails
      const emailRepo = getConnection().getRepository("UserEmail") as Repository<UserEmail>;
      await emailRepo.delete(outdated.id);
    });

    return true;
  }
}

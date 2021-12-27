import { Arg, Mutation, Resolver } from "type-graphql";
import { getConnection } from "typeorm";
import { User } from "../../../orm/entity/User";
import { RESETPWD } from "../../../routes/user";
import { sendUserEmail } from "../../../utils/sendEmail";

@Resolver()
export class ResetPasswordResolver {
  @Mutation(() => Boolean) // Tell type-graphql that return value is of type User
  async resetPassword(@Arg("email") email: string): Promise<boolean> {
    // tell TypeScript that getUser returns a promise of type User or null

    // first of all, find out if email is already in the database
    const registeredUser = await User.findOne({ where: { email } });
    if (!registeredUser) {
      throw new Error("Error: user not found!");
    }

    // make user confirm email before login is enabled
    await sendUserEmail(email, RESETPWD);

    const result = await getConnection()
      .getRepository(User)
      .increment({ id: registeredUser.id }, "tokenVersion", 1);

    return !!result.affected; // amount of affected rows turned into a boolean
  }
}

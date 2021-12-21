import { Arg, Mutation, Resolver } from "type-graphql";
import { User } from "../../entity/User";
import { hash } from "../../utils/crypto";
import { CONFIRMUSER, sendUserEmail } from "../../utils/sendEmail";

@Resolver()
export class RegisterResolver {
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
    if (registeredUser) {
      throw new Error("Error: user already exist!"); // avoid duplicates
    }

    // encrypt the password (keep it a secret)
    const hashedPassword = await hash(password);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    }).save();

    if (!user) {
      throw new Error("Error: unable to create user!"); // some unhandled error - net, connection, DB, disc whatever ...
    }

    // make user confirm email before login is enabled
    await sendUserEmail(email, CONFIRMUSER);

    return user;
  }
}

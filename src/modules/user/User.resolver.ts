import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { User } from "../../entity/User";
import { hash, verify } from "../../utils/crypto";

@Resolver()
export class UserResolver {
  @Query(() => User) // Tell type-graphql that return value of this query is of type User
  async getUser(
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<User | null> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return null;
    }

    const validated = await verify(user.salt, user.password, password);
    if (!validated) {
      return null;
    }
    // notice, that even though user contains both salt and password, those fields are kept private
    return user;
  }

  @Mutation(() => User)
  async register(
    @Arg("firstname") firstName: string,
    @Arg("lastname") lastName: string,
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<User | null> {
    // first of all, find out if email is already in the database
    const registeredUser = await User.findOne({ where: { email } });
    console.log("registeredUser", registeredUser);

    if (registeredUser) {
      return null; // about - avoid duplicates
    }

    // encrypt the password (keep it a secret)
    const cryptoResp = await hash(password);
    console.log("hashedPwd", cryptoResp.password);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: cryptoResp.password,
      salt: cryptoResp.salt,
    }).save();

    if (!user) {
      return null;
    }

    return user;
  }
}

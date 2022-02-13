import { Arg, Mutation, Resolver } from "type-graphql";
import { getConnection, Repository } from "typeorm";
import { User } from "../../../orm/entity/User";
import { CONFIRMUSER } from "../../../routes/user";
import { hash } from "../../../utils/crypto";
import HttpError from "../../../utils/httpError";
import { sendUserEmail } from "../../../utils/sendEmail";

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
    const userRepo = getConnection().getRepository("User") as Repository<User>;
    const registeredUser = await userRepo.findOne({ where: { email } });
    if (registeredUser) {
      throw new HttpError(400, "BadRequestError", "User already exist", { label: "gql/register" }); // avoid duplicates
    }

    try {
      // encrypt the password (keep it a secret)
      const hashedPassword = await hash(password);
      const user = await userRepo
        .create({
          firstName,
          lastName,
          email,
          password: hashedPassword,
        })
        .save();

      if (!user) {
        throw new HttpError(500, "InternalServerError", "Unable to create user", { label: "gql/register" }); // some unhandled error - net, connection, DB, disc whatever ...
      }

      // make user confirm email before login is enabled
      await sendUserEmail(email, CONFIRMUSER);
      return user;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error; // error already handled
      }
      throw new HttpError(500, "InternalServerError", error.message, { label: "gql/register", error }); // some unhandled error - net, connection, DB, disc whatever ...
    }
  }
}

import jwt, { SignOptions } from "jsonwebtoken";
import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { User } from "../../entity/User";
import { hash, verify } from "../../utils/crypto";

/**
 * saince this is a return value in GraphQL, we need to let GraphQL know about it - so it becomes an @ObjectType
 */
@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}

@Resolver()
export class UserResolver {
  @Query(() => [User])
  users() {
    return User.find();
  }

  @Query(() => User) // Tell type-graphql that return value of this query is of type User
  async getUser(
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<User | null> {
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

  @Mutation(() => LoginResponse) // Tell type-graphql that return value of this mutation is of type LoginResponse
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<LoginResponse> {
    // make TypeScritp verify that we are returning a promise of the type LoginResponse
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error("Invalid email or password!");
    }

    const validated = await verify(password, user.password);
    if (!validated) {
      throw new Error("Invalid username or password!");
    }

    // login successful, now create a JSON Web Token - https://www.npmjs.com/package/jsonwebtoken
    const payload = { userId: user.id }; // typesafety - could be: parseInt(user.id.toString())
    const options: SignOptions = {
      header: { alg: "HS384", typ: "JWT" },
      expiresIn: "15m",
      algorithm: "HS384",
    };
    // console.log("jwt.sign("+ JSON.stringify(payload) +", jwtsecretKey, "+ JSON.stringify(options) +")");

    return {
      accessToken: jwt.sign(payload, process.env.JWT_ACCESS_TOKEN_SECRET!, options),
    };
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

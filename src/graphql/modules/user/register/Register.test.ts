import faker from "faker";
import { Connection } from "typeorm";
import { User } from "../../../../orm/entity/User";
import { gqlCall } from "../../../../test-utils/gqlCall";
import { testConn } from "../../../../test-utils/testConn";

let conn: Connection;
beforeAll(async () => {
  conn = await testConn();
});

afterAll(async () => {
  await conn.close();
});

/**
 * the graphql schema is called directly, using the graphql(...) function.
 * graphql takes some input arguments - like a schema, query/mutation
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in a helper-function gqlCall
 */

const registerMutation = `
mutation Register($firstname: String!, $lastname: String!, $email: String!, $password: String!) {
	register(
	  firstname: $firstname
    lastname: $lastname
    email: $email
    password: $password
	) {
	  id
	  firstName
	  lastName
	  email
	  name
	}
 }
`;

let duplicateUser: { firstname: string; lastname: string; email: string; password: string };

describe("Register resolver", () => {
  /**
   * Success scenario: Create user
   */
  test("Create user - success", async () => {
    const user = {
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(8),
    };
    duplicateUser = user; // used in next test
    // console.log("user: ", user);

    const response = await gqlCall({
      source: registerMutation,
      variableValues: user,
    });
    // console.log("response: ", response);

    expect(response).toMatchObject({
      data: {
        register: {
          id: response.data!.register.id,
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email,
          name: user.firstname + " " + user.lastname,
        },
      },
    });

    const dbUser = await User.findOne({ where: { email: user.email } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.firstName).toEqual(user.firstname);
    expect(dbUser?.confirmed).toBeFalsy();
  });

  /**
   * Error scenario: "Error: user already exist!"
   */
  test("Duplicate user - failure", async () => {
    const response = await gqlCall({
      source: registerMutation,
      variableValues: duplicateUser,
    });
    // console.log("response: ", response);

    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBe(1);
    expect(response.errors![0].message).toEqual("User already exist");
  });

  /**
   * Error scenario: "Error: unable to create user!"
   *
   * This scenario requires a user with a unique email ... and some reason why the user is NOT created
   * in the database - e.g.: 'database down', 'network failure' - stuff like that.
   * For now, I accept that this scenario is not tested.
   */
});

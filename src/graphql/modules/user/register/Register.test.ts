import faker from "faker";
import { Connection } from "typeorm";
import { User } from "../../../../orm/entity/User";
import { gqlCall } from "../../../../test-utils/gqlCall";
import { testConn } from "../../../../test-utils/testConn";

/**
 * the graphql schema is called directly, using the graphql(...) function.
 * graphql takes some input arguments - like a schema, query/mutation
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in a helper-function gqlCall
 */

export const registerMutation = `
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

describe("Register resolver", () => {
  var conn: Connection;
  var fakeUser: { firstname: string; lastname: string; email: string; password: string };

  beforeAll(async () => {
    conn = await testConn();
    // console.log("Register.test.ts DB: " + conn.driver.database);
    fakeUser = {
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(8),
    };
  });

  afterAll(async () => {
    conn.isConnected && (await conn.close());
  });

  /**
   * Success scenario: Create user
   */
  test("Create user - success", async () => {
    // console.log("fakeUser: ", fakeUser);
    expect(fakeUser.email.length).toBeGreaterThan(0)

    const response = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });

    expect(response).toMatchObject({
      data: {
        register: {
          id: response.data!.register.id,
          firstName: fakeUser.firstname,
          lastName: fakeUser.lastname,
          email: fakeUser.email,
          name: fakeUser.firstname + " " + fakeUser.lastname,
        },
      },
    });

    const user = await conn.getRepository(User).findOne({ where: { email: fakeUser.email } });
    expect(user).toBeDefined();
    expect(user?.firstName).toEqual(fakeUser.firstname);
    expect(user?.confirmed).toBeFalsy();
  });

  /**
   * Error scenario: "Error: user already exist!"
   */
  test("Duplicate user - failure", async () => {
    expect(fakeUser.email.length).toBeGreaterThan(0);

    const response = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser, // attempt to register fakeUser second time
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

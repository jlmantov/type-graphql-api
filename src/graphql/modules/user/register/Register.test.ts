import faker from "faker";
import { Connection, Repository } from "typeorm";
import { User } from "../../../../orm/entity/User";
import { gqlCall } from "../../../../test-utils/gqlCall";
import testConn from "../../../../test-utils/testConn";

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
  let conn: Connection;
  let userRepo: Repository<User>;
  let fakeUser: { firstname: string; lastname: string; email: string; password: string };

  beforeAll(async () => {
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    // console.log("Register.test.ts DB: " + conn.driver.database);
    fakeUser = {
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(8),
    };
  });

  afterAll(async () => {
    conn.isConnected && await conn.close();
  });

  beforeEach(async () => {
    // await conn.clear();
  });

  /**
   * Success scenario: Create user
   */
  test("Create user - success", async () => {
    // console.log("fakeUser: ", fakeUser);
    expect(fakeUser.email.length).toBeGreaterThan(0);

    const response = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });

    // const entities: string[] = [];
    // conn.entityMetadatas.forEach((entity) => {
    //   entities.push(entity.targetName);
    // });
    // console.log("Create user (success) - Entities: " + JSON.stringify(entities, null, 2));

    expect(response.data).toBeDefined();
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

    const user = await userRepo.findOne({ where: { email: fakeUser.email } });
    // console.log("Create user (success) - userRepo.findOne: " + JSON.stringify(user, null, 2));
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
  test("Error scenario: unable to create user", async () => {
    fakeUser = {
      firstname: await faker.name.firstName(),
      lastname: await faker.name.lastName(),
      email: "",
      password: "",
    };

    const response = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });
    console.log("Error scenario: unable to create user - response: ", response);

    expect(response.errors).toBeDefined();
  });
});

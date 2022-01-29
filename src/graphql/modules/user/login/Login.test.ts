import faker from "faker";
import { Connection, Repository } from "typeorm";
import { User } from "../../../../orm/entity/User";
import { gqlCall } from "../../../../test-utils/gqlCall";
import testConn from "../../../../test-utils/testConn";
import { registerMutation } from "../register/Register.test";

/**
 * the graphql schema is called directly, using the graphql(...) function.
 * graphql takes some input arguments - like a schema, query/mutation
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in a helper-function gqlCall
 */

const loginQuery = `
query login($email: String!, $password: String!) {
	login(
    email: $email
    password: $password
	) {
	  accessToken
	}
 }
`;

describe("Login resolver", () => {
  let conn: Connection;
  let userRepo: Repository<User>;
  let user: User;
  const fakeUser = {
    firstname: faker.name.firstName(),
    lastname: faker.name.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password(8),
  };

  beforeAll(async () => {
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    // console.log("Login.test.ts DB: " + conn.driver.database);

    const result = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });
    if (!!result.data && result.data.register) {
      user = result.data.register;
      await userRepo.increment({ id: user.id }, "confirmed", 1); // allow user to login
      user.confirmed = true;
      user.tokenVersion = 0; // used by accesstoken
    }
  });

  afterAll(async () => {
    conn.isConnected && (await conn.close());
  });

  // beforeEach(() => jest.clearAllMocks());

  /**
   * Error scenario: User email not validated
   */
  test("should fail, email not confirmed", async () => {
    expect(user).toBeDefined();
    await userRepo.update(user.id, { confirmed: false });

    const response = await gqlCall({
      source: loginQuery,
      variableValues: {
        email: fakeUser.email,
        password: fakeUser.password,
      },
    });
    // console.log("email not confirmed response: ", JSON.stringify(response, null, 2));

    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBe(1);
    expect(response.errors![0].message).toEqual(
      "Email needs to be confirmed in order to enable login!"
    );
  });

  /**
   * Success scenario: User login success, accessToken in response
   */
  test.skip("Login success", async () => {
    expect(user).toBeDefined();
    await userRepo.update(user.id, { confirmed: true });

    const loginEmailPwd = {
      email: fakeUser.email,
      password: fakeUser.password,
    };

    const response = await gqlCall({
      source: loginQuery,
      variableValues: loginEmailPwd,
    });
    console.log("Login success response: ", JSON.stringify(response, null, 2));

    expect(response).toMatchObject({
      data: {
        login: {
          accessToken: response.data!.login.accessToken,
        },
      },
    });
  });

  // /**
  //  * Error scenario: "Error: user already exist!"
  //  */
  test("Login failed", async () => {
    const loginNotWorking = {
      email: "this.user.does.not@exist.com",
      password: "shouldFail",
    };

    const response = await gqlCall({
      source: loginQuery,
      variableValues: loginNotWorking,
    });
    // console.log("Login failed response: ", JSON.stringify(response, null, 2));

    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBe(1);
    expect(response.errors![0].message).toEqual("Invalid email or password");
  });

  /**
   * Error scenario: "Error: unable to create user"
   *
   * This scenario requires a user with a unique email ... and some reason why the user is NOT created
   * in the database - e.g.: 'database down', 'network failure' - stuff like that.
   * For now, I accept that this scenario is not tested.
   */
});

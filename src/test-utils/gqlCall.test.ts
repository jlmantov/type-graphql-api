import faker from "faker";
import { Connection, Repository } from "typeorm";
import { registerMutation } from "../graphql/modules/user/register/Register.test";
import { User } from "../orm/entity/User";
import logger from "../utils/middleware/winstonLogger";
import { gqlCall } from "./gqlCall";
import testConn from "./testConn";

/**
 * the graphql schema is called directly, using the graphql(...) function.
 * graphql takes some input arguments - like a schema, query/mutation
 *
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in the helper-function: gqlCall
 */

const nonExistingQuery = `
query ($email: String!) {
	tst(
    email: $email
	) {
	  id
	  email
	  name
	}
}`;

const getUserQuery = `
query GetUser($email: String!, $password: String!) {
	getUser(
     email: $email
     password: $password
	) {
	  id
	  email
	  name
	}
}`;

describe("gqlCall test-util", () => {
  let conn: Connection;
  let userRepo: Repository<User>;
  const fakeUser = {
    firstname: faker.name.firstName(),
    lastname: faker.name.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password(8),
  };

  beforeAll(async () => {
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    logger.info(" --- gqlCall.test.ts DB: " + conn.driver.database);
  });

  afterAll(async () => {
    conn.isConnected && (await conn.close());
  });

  /**
   *
   */
  test("create test user - success", async () => {
    const alreadyExist = await userRepo.findOne({
      where: { email: fakeUser.email },
    });
    if (alreadyExist && alreadyExist.email === fakeUser.email) {
      // During development, using `jest --watchAll`, the database will not be reset on every run.
      // This will allow continuous runs and stop jest from reporting an error that really isn't an error
      // logger.debug("John Doe found in DB, skipping this test.");
    } else {
      // logger.debug("John Doe not found!");
      const response = await gqlCall({
        source: registerMutation,
        variableValues: fakeUser,
      });
      // logger.debug("response: ", response);

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
      expect(user).toBeDefined();
      expect(user?.firstName).toEqual(fakeUser.firstname);
      expect(user?.confirmed).toBeFalsy();
    }
  });

  /**
   * Attempt a query that doesn't exist
   */
  test("Attempt a query that doesn't exist", async () => {
    const response = await gqlCall({
      source: nonExistingQuery,
      variableValues: {
        email: fakeUser.email,
      },
    });
    // logger.debug("response: ", response);

    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBe(1);
    expect(response.errors![0].message).toEqual('Cannot query field "tst" on type "Query".');
  });

  /**
   *
   */
  test("Attempt missing argument in guery - failure", async () => {
    const response = await gqlCall({
      source: getUserQuery,
      variableValues: {
        email: fakeUser.email,
        //   password: fakeUser.password,
      },
    });
    // logger.debug("response: ", response);

    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBe(1);
    expect(response.errors![0].message).toEqual(
      'Variable "$password" of required type "String!" was not provided.'
    );
  });
});

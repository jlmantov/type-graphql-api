import { Connection } from "typeorm";
import { User } from "../orm/entity/User";
import { gqlCall } from "./gqlCall";
import { testConn } from "./testConn";

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
 *
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in the helper-function: gqlCall
 */

const johnDoe = {
  firstname: "John",
  lastname: "Doe",
  email: "john.doe@mail.com",
  password: "asdf1234",
};

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
}`;

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
  /**
   *
   */
  test("create well known test user: John Doe - success", async () => {
    const alreadyExist = await User.findOne({ where: { email: johnDoe.email } });
    if (alreadyExist && alreadyExist.email === johnDoe.email) {
      // During development, using `jest --watchAll`, the database will not be reset on every run.
      // This will allow continuous runs and stop jest from reporting an error that really isn't an error
      console.log("John Doe found in DB, skipping this test.");
    } else {
      // console.log("John Doe not found!");
      const response = await gqlCall({
        source: registerMutation,
        variableValues: johnDoe,
      });
      // console.log("response: ", response);

      expect(response).toMatchObject({
        data: {
          register: {
            id: response.data!.register.id,
            firstName: johnDoe.firstname,
            lastName: johnDoe.lastname,
            email: johnDoe.email,
            name: johnDoe.firstname + " " + johnDoe.lastname,
          },
        },
      });

      const dbUser = await User.findOne({ where: { email: johnDoe.email } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.firstName).toEqual(johnDoe.firstname);
      expect(dbUser?.confirmed).toBeFalsy();
    }
  });

  /**
   * Attempt a query that doesn't exist
   */
  test("Attempt a query that doesn't exist", async () => {
    const response = await gqlCall({
      source: nonExistingQuery,
      variableValues: {
        email: johnDoe.email,
      },
    });
    // console.log("response: ", response);

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
        email: johnDoe.email,
        //   password: johnDoe.password,
      },
    });
    // console.log("response: ", response);

    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBe(1);
    expect(response.errors![0].message).toEqual(
      'Variable "$password" of required type "String!" was not provided.'
    );
  });
});

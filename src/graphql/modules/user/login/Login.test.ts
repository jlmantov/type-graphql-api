import { CookieOptions } from "express";
import faker from "faker";
import { Connection, Repository } from "typeorm";
import { User } from "../../../../orm/entity/User";
import { UserEmail } from "../../../../orm/entity/UserEmail";
import { gqlCall } from "../../../../test-utils/gqlCall";
import testConn from "../../../../test-utils/testConn";
import logger from "../../../../utils/middleware/winstonLogger";
import { registerMutation } from "../register/Register.test";

/**
 * the graphql schema is called directly, using the graphql(...) function.
 * graphql takes some input arguments - like a schema, query/mutation
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in a helper-function gqlCall
 */

export const loginQuery = `
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
  let emailRepo: Repository<UserEmail>;
  let dbuser: User;
  const fakeUser = {
    firstname: faker.name.firstName(),
    lastname: faker.name.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password(8),
  };

  beforeAll(async () => {
    conn = await testConn.create();
    userRepo = conn.getRepository("User");
    emailRepo = conn.getRepository("UserEmail");
    logger.info(" --- Login.test.ts DB: " + conn.driver.database);

    // Register test user
    const res = await gqlCall({
      source: registerMutation,
      variableValues: fakeUser,
    });
    // Confirmation email is part of the test, keep it for now
    if (!!res.data && res.data.register) {
      dbuser = res.data.register as User;
      // await userRepo.update(dbuser.id, { confirmed: true }); // allow user to login
      // await emailRepo.delete({ email: fakeUser.email });
      // dbuser.confirmed = true;
      // dbuser.tokenVersion = 0; // used by accesstoken
    }
    logger.silly(" -- beforeAll -->  dbuser:", dbuser);
  });

  afterAll(async () => {
    conn.isConnected && (await conn.close());
  });

  // beforeEach(() => jest.clearAllMocks());

  /**
   * Error scenario: User email not validated
   */
  test("should fail, email not confirmed", async () => {
    expect(dbuser).toBeDefined();
    await userRepo.update(dbuser.id, { confirmed: false });

    const response = await gqlCall({
      source: loginQuery,
      variableValues: {
        email: fakeUser.email,
        password: fakeUser.password,
      },
    });
    // logger.debug("email not confirmed response: ", JSON.stringify(response, null, 2));

    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBe(1);
    expect(response.errors![0].message).toEqual(
      "Email needs to be confirmed in order to enable login"
    );
  });

  /**
   * Success scenario: User login success, accessToken in response
   */
  test("Login success", async () => {
    expect(dbuser).toBeDefined();
    expect(dbuser.email).toEqual(fakeUser.email);
    await userRepo.update(dbuser.id, { confirmed: true }); // allow user to login
    await emailRepo.delete({ email: fakeUser.email });
    dbuser = (await userRepo.findOne(dbuser.id)) as User;
    logger.silly(" -- Login success --> dbuser: ", { dbuser });

    // If /graphql were served by Express, we could have done like below:
    //    const reqBody = { query: `query { login( email: "${fakeUser.email}" password: "${fakeUser.password}" ) { accessToken } }` };
    //    logger.silly(" -- Login success --> reqBody: ", { reqBody });
    //    const tstReq = await request(app);
    //    const tstRes = await tstReq.post("/graphql").send(reqBody);
    //    logger.silly(" -- Login success --> response: ", { response: tstRes });
    //  ... but /graphql is served by ApolloServer.

    const loginEmailPwd = {
      email: fakeUser.email,
      password: fakeUser.password, // this one is plain text (db password is encrypted)
    };
    logger.silly(" -- Login success --> loginEmailPwd: ", { loginEmailPwd });

    let tstCookies: { name: string; options: CookieOptions | undefined }[] = [];
    const mockSetCookie = (name: string, options?: CookieOptions | undefined) => {
      // logger.silly(" -- gqlCall setCookie - name=" + name + ", options:" + JSON.stringify(options));
      tstCookies.push({ name, options });
    };
    const mockClearCookie = (name: string, _options?: CookieOptions | undefined) => {
      tstCookies = tstCookies.filter((cookie) => cookie.name !== name);
      // logger.silly(" -- gqlCall clearCookie - name=" + name + ", options:" + JSON.stringify(options));
    };

    const tstRes = await gqlCall({
      source: loginQuery,
      variableValues: loginEmailPwd,
      contextValue: {
        req: {
          session: {
            userId: dbuser.id,
          },
        },
        res: {
          clearCookie: mockClearCookie,
          cookie: mockSetCookie,
        },
      },
    });
    logger.silly(" -- Login success --> tstCookies: ", tstCookies);
    logger.silly(" -- Login success --> response: ", { response: tstRes });

    expect(tstRes.data).toBeDefined();
    expect(tstRes.data?.login).toHaveProperty("accessToken");
    expect(tstRes.data?.login.accessToken.length).toBeGreaterThan(150); // ~ 170-172
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
    // logger.debug("Login failed response: ", response.errors);

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

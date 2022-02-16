import { gqlCall } from "../../test-utils/gqlCall";
import logger from "../../utils/middleware/winstonLogger";

/**
 * the graphql schema is called directly, using the graphql(...) function.
 * graphql takes some input arguments - like a schema, query/mutation
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored in a helper-function gqlCall
 */

export const isAliveQuery = `query isAlive { isAlive }`;

describe("IsAlive resolver", () => {
  beforeAll(() => {
    logger.info(" --- IsAlive.test.ts");
  });

  test("Success", async () => {
    const utcBefore = new Date().getTime();
    logger.silly(` -- isAlive - Success --> utcBefore: ${utcBefore}`);

    const response = await gqlCall({
      source: isAliveQuery,
      variableValues: {},
    });
    logger.silly(" -- isAlive - Success --> response", response);

    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty("isAlive");
    expect(response.data?.isAlive).toBeGreaterThan(utcBefore);
    const utc = response.data?.isAlive;
    logger.silly(" -- isAlive - Success --> utcTimestamp", { timestamp: utc });
  });

  test("Valid DateTime", async () => {
    const response = await gqlCall({
      source: isAliveQuery,
      variableValues: {},
    });
    logger.silly(" -- isAlive - Valid DateTime --> response", response);

    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty("isAlive");

    const timestamp = response.data?.isAlive;
    logger.silly(` -- isAlive - Valid DateTime --> utcTimestamp: ${timestamp}`);
    const dateStr = new Date(timestamp).toString();
    logger.silly(` -- isAlive - Valid DateTime --> date: ${dateStr}`);
    expect(dateStr).toContain("GMT");
  });
});

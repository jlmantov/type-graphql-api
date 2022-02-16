import { Query, Resolver } from "type-graphql";
import logger from "../../utils/middleware/winstonLogger";

/**
 * IsAlive returns a UTC timestamp
 * https://typegraphql.com/docs/extensions.html#using-the-extensions-decorator
 */
// @ObjectType()
// class IsAliveResponse {
//   @Field()
//   utcTimestamp: number;
// }

@Resolver()
export class IsAliveResolver {
  @Query(() => Number) // Tell type-graphql that return value is of type IsAliveResponse
  async isAlive() {
    // tell TypeScript that IsAlive returns a promise of type IsAliveResponse

    // create a JSON Web Token - https://www.npmjs.com/package/jsonwebtoken
    const utcTimestamp = new Date().getTime();
    logger.silly(" -- IsAlive --> utcTimestamp: ", { utcTimestamp });
    return utcTimestamp;
  }

  // async isAlive(): Promise<IsAliveResponse> {
  //   // tell TypeScript that IsAlive returns a promise of type IsAliveResponse

  //   // create a JSON Web Token - https://www.npmjs.com/package/jsonwebtoken
  //   const utcTimestamp = new Date().getTime();
  //   logger.silly(" -- IsAlive --> utcTimestamp: ", { utcTimestamp });
  //   return {
  //     utcTimestamp,
  //   };
  // }
}

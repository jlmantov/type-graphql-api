import { graphql, GraphQLSchema } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";
import { createSchema } from "../graphql/utils/createSchema";

interface Options {
  source: string;
  variableValues?: Maybe<{
    [key: string]: any;
  }>;
  userId?: number;
  contextValue?: {
    req: any;
    res: any;
  };
}

let schema: GraphQLSchema;

/**
 * GraphQL calls are done through this helper function.
 * GraphQL is going to be called a lot, so the setup around graphql(...) is stored here.
 *
 * interface GraphQLArgs:
 * - schema: GraphQLSchema - the GraphQL schema
 * - source: string | Source - the query/mutation (string)
 * - rootValue?: any
 * - contextValue?: any - these are the context valuess used inside the graphql call
 * - variableValues?: Maybe<{ [key: string]: any }> - (optional) input values for the graphql call
 * - operationName?: Maybe<string>
 * - fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
 * - typeResolver?: Maybe<GraphQLTypeResolver<any, any>>
 *
 * This way, the schema is called directly - so I don't need to set up a test server
 */
export const gqlCall = async ({ source, variableValues, userId, contextValue }: Options) => {
  if (!schema) {
    schema = await createSchema(); // created first time, reused ever after
  }

  // context can be specified in test cases and passed to graphql - response cookies need mock functions in order to succeed
  let context = {
    req: {
      session: {
        userId,
      },
    },
    res: {},
  };
  if (!!contextValue) {
    context = contextValue;
  }

  // https://www.npmjs.com/package/graphql
  // graphql.org/graphql-js/graphql/
  const response = await graphql({
    schema,
    source,
    variableValues,
    contextValue: context,
  });

  // logger.debug("gqlCall response: ", response);
  return response; // ExecutionResult contains either error OR data
};

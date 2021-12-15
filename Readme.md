# TypeGraphQL API - with Email authentication and JWT authorization

This Readme was never intended to be a stand-alone step by step walk-through.
It would be more precise to call it sort of a 'memory map' - a guide to reproduce the reading path (if needed) and a way of organizing the project's different steps - from beginning to a fully functional API.

If this is helpful to others - please, be my guest. My personal mindset includes curiosity and a playful attitude. If something seems unclear, I suggest looking into the [commit-history](https://github.com/jlmantov/type-graphql-api/commits/main) and following the file changes along the way ... and of course: additional reading in general.

Based on a mix of [tutorials and articles](./docs/links.md)

## Technologies

- TypeScript
- GraphQL
- TypeGraphQL
- TypeORM
- MySQL
- Apollo (with express)

## Setup GraphQL server using TypeGraphQL and TypeORM

check preconditions:

```
$ node -v
$ npm -v
$ npx -v
$ npm run typescript -v
$ tsc -v
```

### Init project

Init typeORM (from rootDir's parent directory) - [Quick Start](https://typeorm.io/#undefined/quick-start)

```
$ npm i -g typeorm
$ typeorm init --name type-graphql-api --database mysql
$ cd type-graphql-api
```

### Hello Github

First, create repository in github interactively, then add local project to github

```
$ git init
$ git add Readme.md
$ git commit -m "initial commit"
$ git branch -M main
$ git remote add origin https://github.com/<MyProfile>/type-graphql-api.git
$ git push -u origin main
```

### Config TypeORM

The `typeorm init` command provides both `package.json` and `tsconfig.json` that is somewhat outdated - which means it would be wise to update the versions used (the two commands below do exactly that).

Update `package.json`

```
$ npm install --save typeorm reflect-metadata
$ npm install --save-dev typeorm typescript @types/node
```

Update `tsconfig.json`

```
$ npx tsconfig.json
```

Optionally run `tsc --init` or consult [Stack Overflow](https://stackoverflow.com/questions/36916989/how-can-i-generate-a-tsconfig-json-file)

I chose this [setup](https://github.com/jlmantov/type-graphql-api/blob/main/tsconfig.json) (same as Ben Awad's tutorial).

### Setup a local Docker MySQL database

(NB: no need to do this, almost any database connection will do - pick your favourite. :)

Create Docker config file

```
$ touch docker-compose.yml
```

If you'd like to get started using Docker, now is a good time to do it.
I used this article to get started:
[How to Create a MySql Instance with Docker Compose](https://medium.com/@chrischuck35/how-to-create-a-mysql-instance-with-docker-compose-1598f3cc1bee)
... and a tutorial by [Kris Foster](https://www.youtube.com/playlist?list=PLdk2EmelRVLpIdCFolrwdLhCTHyeefU6W)

Startup database in a (deamon) background process:

```
$ docker compose up -d
```

Shutdown database (deamon):

```
$ docker-compose down
```

### Add Database driver to project

```
$ npm install --save mysql2
```

### Modify `ormconfig.json` according to local settings

My docker-compose.yml looks like [this](https://github.com/jlmantov/type-graphql-api/blob/main/docker-compose.yml)

...and this is how ormconfig.json looks like [this](https://github.com/jlmantov/type-graphql-api/blob/main/ormconfig.json)

### Test DB connection

Make sure the database is running - in my case, a check could look like this:

```
$ docker compose ps
NAME                    COMMAND                  SERVICE             STATUS              PORTS
type-graphql-api-db-1   "docker-entrypoint.s…"   db                  running             0.0.0.0:3306->3306/tcp
```

...then startup typeORM

```
$ npm start
```

If it works, the default typeorm `src/index.ts` provided this output:

```
  :
Loaded users:  [
  User { id: 1, firstName: 'Timber', lastName: 'Saw', age: 25 }
]
Here you can setup and run express/koa/any other framework.
```

OK, the database is up and running, TypeORM is connecting to it and provides data .... let's move on.

### Setup GraphQL server

```
$ npm install graphql express apollo-server-express
$ npm install --save-dev @types/express
```

1. Modify index.ts - remove default stuff and add an express server, check if the server responds on port 4000

2. Now, let's get Apllo Server started and GraphQL responding...

Note 1: I like the [GraphQL Playground](https://www.apollographql.com/docs/apollo-server/testing/build-run-queries/#graphql-playgroundhttps://www.apollographql.com/docs/apollo-server/testing/build-run-queries/#graphql-playground) look and feel. In order to get that, I chose to install the ApolloServerPluginLandingPageGraphQLPlayground plugin

```
$ npm i -D apollo-server-core
```

Note 2: Graphql Playground must be [configured](https://www.apollographql.com/docs/react/v2/get-started/#configuration-options) with `"request.credentials": "include",` if cookies are to be used.

### Define schema using TypeGraphQL

Very soon objects are going to be introduced and the code wil expand ... time for a little cleanup!

The graphql schema is going to be provided by [TypeGraphQL](https://typegraphql.com/)

```
$ npm i type-graphql
```

The amount os schema definitions will grow - AND be used in both production and testing.
Therefore, schema and resolver definitions are moved to `src/utils/createSchema.ts`

While re-arranging the code, `src/modules/user/User.resolver.ts` is provided to verify that everything still works:

```
$ npm start
```

Go to GraphQL Playground and re-execute the query:

```
query {
  hello
}
```

The response should now be:

```
{
  "data": {
    "hello": "hi!"
  }
}
```

### Password encryption

Password encryption is isolated to a single file in order to be able to change it easily

```
$ npm install argon2
```

I am not 100% sure that I want to actually store salt and password seperately - maybe I even choose to store all parameters in every password (even though it would be LOTS of redundancy) ... for now, I choose to isolate password encryption/decryption in `src/utils/crypto.ts`. This way it is easier to apply future changes.

We need to be able to

1. hash a password and
2. verify a given password (login attempt) against the stored hashed version

Most default options are just fine - one thing though: I want to use argon2id, which differs from default.

To begin with, I found it strange to store all parameters in each and every password, so I extracted salt and password - the two values that needs to be stored.
By studying the `src/utils/crypto.ts` it appears that I did a fairly deep dive into argon2 to make sure that I did it correctly (maybe not intentional, but correctly).

The end result is 2 methods providing me with what I need

1. hash: (pwd: string) => Promise&lt;CryptoResponse&gt;
2. verify: (hashedSalt: string, hashedPwd: string, pwd: string) => Promise&lt;boolean&gt;

### Create User mutation in GraphQL

Modify `src/entity/User.ts`

1. Add email, salt and password (using argon2id) to DB
2. In order to make type-graphql understand the datastructure, add @ObjectType to entity
3. add name (combined firstName & lastName) as a schema field which is not stored in DB ... just for the fun of it

When project is growing, I'd like to maintain a structure in my filenames like `User.resolver.ts`, `User.test.ts` and so on...
`src/modules/user/UserResolver.ts` is renamed to `src/modules/user/User.resolver.ts`

To verify password encryption/verification, add two temptorary methods to `src/modules/user/User.resolver.ts`

Mutation: `register(firstname, lastname, email, password)`

1. Make sure the email is not already stored in the database
2. use password as input to argon2id to create hashed salt+password
3. create new User object, exchanging the password with the hashed values
4. store the object in database
5. return the new user object to GraphQL

GraphQL Playground

```
mutation {
  register(
    firstname: "John"
    lastname: "Doe"
    email: "john.doe@mail.com"
    password: "asdf1234"
  ) {
    id
    firstName
    lastName
    email
    name
  }
}
```

Response:

```
{
  "data": {
    "register": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@email.com",
      "name": "John Doe"
    }
  }
}
```

Query: `getUser(email, password)`

1. use email to find stored User in the database
2. verify the given password against the stored hashed values
3. return User if validated, otherwise throw an error

GraphQL Playground

```
query {
  getUser(email: "john.doe@mail.com", password:"asdf1234") {
    id
    name
    email
  }
}
```

Response:

```
{
  "data": {
    "getUser": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@mail.com"
    }
  }
}
```

## Login and create access token + refresh token

```
$ npm i jsonwebtoken
$ npm i -D @types/jsonwebtoken
```

### Login and access token

The temporary graphql method `getUser()` is actually pretty close to the login we want. We just need to tweek it a little bit - add a [JSON Web Token](https://www.npmjs.com/package/jsonwebtoken) to the response and such...

1. Instead of returning User, login will return a JSON Web Token ... or an error.

2. I regret splitting (argon2 specific) salt and password into two fields, so now I change that and concat them into hashedPwd

3. JSON Web Token needs a server-/domain-specific secret in order to do the validation

NOTE: This gitHub boilerplate-repository need some changes with regards to safety, in order to mature into production.

Database parameters, JWT secret key etc. should be protected and loaded into memory at runtime (ex. from a .env file) - not like this, stored in a file inside the repository, available in cleartext for everybody to access the source files.

For now, I follow the same (dev) path: jwtSecret is stored in `src/utils/crypto.ts` ... and of course, the value is expected to be changed into something - well, secret!!!

### Dotenv

No, actually it's very easy to do it right: store config parameters in a `.env` file, so let's get on with it

```
$ npm i dotenv
```

The same way argon2 is 'stoved away' in a separate file, let's create `src/utils/auth.ts` and do the same - isolate JWT in a single file and access the functionality through method calls:

- createAccessToken(user)
- createRefreshToken(user)

### refresh token

Refresh token is not part of every request like the access token - it doesn't follow the client workflow, so it would be clumsy to carry it around everywhere.

Refresh token is used for "transparent" re-login when the access token expires - it should have it's own API path and be treated differently.

Let's store the refresh token in a Cookie - which means:

=> Alter the express response from where GraphQL resides (inside the Apolloserver)

=> Add express request + response to ApolloServer Context, which makes it available to TypeGraphQL resolvers

=> Add (TypeGraphQL) Context to resolvers where needed

=> Create a ContextType in order for TypeScript to understand and validate the context correctly

=> In the TypeGraphQL resolver (where the refresh token is created), add @Ctx() to the list of input parameters

### Test cookie in GraphQL Playground

NOTE: Verify that GraphQL Playground settings is actually prepared for handling cookies: `"request.credentials": "include"`

Open Developer Tools (one way to to it is right click -> inspect), go to Network, first clear the list, execute and then grap the right request:

- Response Headers should include `Set-Cookie: jid=.....`
- Response should include login, holding the accessToken
- Cookie named 'jid' should be part of the response

Instead of Network, one can also select Application and inspect the Cookie from there.

By the way: I don't really think `login` is a TypeGraphQL mutation - the database is queried but not modified, so I decided to convert it to a Query.

## Authenticated mutations and queries

In order to authenticate queries (separate personal stuff from public access), `src/utils/isAuth` is added as a Middleware function.

By adding authentication as middleware, the authentication is performed before the query/mutation takes place.

When accessing authenticated (personal) data, the user should be extracted from the token - meaning that user is identified through the token's payload: userId.


### Temporary TypeGraphQL Query: isAuthenticated - for testing purposes

Since the token is accessed inside a middleware function, that runs *before* the query/mutation (in a different scope), the token payload is now added to `src/utils/GraphqlContext.ts` in order to make payload content accessible to queries/mutations.

Note that payload is __optional__  in `GraphqlContext` - after all, it should still be possible to access req/res inside publicly accessible queries/mutations.


## Refresh the token

## Revoke tokens for a user (change passord)

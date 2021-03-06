# TypeGraphQL API - with Email authentication and JWT authorization

## Content

- [Motivation](./#motivation)
- [Technologies](https://github.com/jlmantov/type-graphql-api#technologies)
- [Setup GraphQL server using TypeGraphQL and TypeORM](https://github.com/jlmantov/type-graphql-api#setup-graphql-server-using-typegraphql-and-typeorm)
- [Setup a local Docker MySQL database](https://github.com/jlmantov/type-graphql-api#setup-a-local-docker-mysql-database)
- [Setup GraphQL server](https://github.com/jlmantov/type-graphql-api#setup-graphql-server)
- [Password encryption](https://github.com/jlmantov/type-graphql-api#password-encryption)
- [Create User mutation in GraphQL](https://github.com/jlmantov/type-graphql-api#create-user-mutation-in-graphql)
- [Login and create access token + refresh token](https://github.com/jlmantov/type-graphql-api#login-and-create-access-token--refresh-token)
- [Authenticated mutations and queries](https://github.com/jlmantov/type-graphql-api#authenticated-mutations-and-queries)
- [Refresh the accessToken](https://github.com/jlmantov/type-graphql-api#refresh-the-accesstoken)
- [Revoke tokens for a user (change password)](https://github.com/jlmantov/type-graphql-api#revoke-tokens-for-a-user-change-password)
- [Confirmation email](https://github.com/jlmantov/type-graphql-api#confirmation-email)
- [Reorganize TypeGraphQL Resolvers](https://github.com/jlmantov/type-graphql-api#reorganize-typegraphql-resolvers)
- [Reset Password](https://github.com/jlmantov/type-graphql-api#reset-password)
- [Reorganize project - routes, controllers, middleware, graphql](https://github.com/jlmantov/type-graphql-api#reorganize-project---routes-controllers-middleware-graphql)

- [Automated test - Jest](https://github.com/jlmantov/type-graphql-api#automated-test---jest)
- [Testing using ts-jest](https://github.com/jlmantov/type-graphql-api#testing-using-ts-jest)
- [First GraphQL resolver Test - Register](https://github.com/jlmantov/type-graphql-api#first-graphql-resolver-test---register)
- [REST endpoint Testing: GET landing page + POST Renew accessToken](https://github.com/jlmantov/type-graphql-api#rest-endpoint-testing-get-landing-page--post-renew-accesstoken)
- [TypeORM Migrations](https://github.com/jlmantov/type-graphql-api#typeorm-migrations)
- [Logging](https://github.com/jlmantov/type-graphql-api#logging)

## Motivation

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

## Setup a local Docker MySQL database

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
type-graphql-api-db-1   "docker-entrypoint.s???"   db                  running             0.0.0.0:3306->3306/tcp
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

## Setup GraphQL server

```
$ npm install graphql express apollo-server-express
$ npm install --save-dev @types/express
```

1. Modify index.ts - remove default stuff and add an express server, check if the server responds to the port specified in `.env`

2. Now, let's get Apllo Server started and GraphQL responding...

Note 1: I like the [GraphQL Playground](https://www.apollographql.com/docs/apollo-server/testing/build-run-queries/#graphql-playground) look and feel. In order to get that, I chose to install the ApolloServerPluginLandingPageGraphQLPlayground plugin

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
Therefore, schema and resolver definitions are moved to `src/graphql/utils/createSchema.ts`

While re-arranging the code, `src/graphql/modules/user/User.resolver.ts` is provided to verify that everything still works:

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

## Password encryption

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

## Create User mutation in GraphQL

Modify `src/orm/entity/User.ts`

1. Add email, salt and password (using argon2id) to DB
2. In order to make type-graphql understand the datastructure, add @ObjectType to entity
3. add name (combined firstName & lastName) as a schema field which is not stored in DB ... just for the fun of it

When project is growing, I'd like to maintain a structure in my filenames like `User.resolver.ts`, `User.test.ts` and so on...
`src/graphql/modules/user/UserResolver.ts` is renamed to `src/graphql/modules/user/User.resolver.ts`

To verify password encryption/verification, add two temptorary methods to `src/graphql/modules/user/User.resolver.ts`

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

In order to authenticate queries (separate personal stuff from public access), `src/utils/middleware/isAuth` is added as a Middleware function.

By adding authentication as middleware, the authentication is performed before the query/mutation takes place.

When accessing authenticated (personal) data, the user should be extracted from the token - meaning that user is identified through the token's payload: userId.

### Temporary TypeGraphQL Query: isAuthenticated - for testing purposes

Since the token is accessed inside a middleware function, that runs _before_ the query/mutation (in a different scope), the token payload is now added to `src/graphql/utils/GraphqlContext.ts` in order to make payload content accessible to queries/mutations.

Note that payload is **optional** in `GraphqlContext` - after all, it should still be possible to access req/res inside publicly accessible queries/mutations.

## Refresh the accessToken

In order to extract refreshToken from the cookie sent by client:

```
$ npm i cookie-parser
$ npm i -D @types/cookie-parser
```

1. Add cookie-parser to project in order to access the refreshToken cookie
2. Add `renew_accesstoken` route to `src/index.ts`
3. implement `handleJwtRefreshTokenRequest`

This is where I start thinking about creating a UserController ... for now, let's place `handleJwtRefreshTokenRequest` inside `src/utils/auth.ts`.

One tiny addition: Now, the refreshToken cookie is going to be set 2 different places - so this is refactored into its own method: `sendRefreshToken`

### Beautify

The intensions of isolating JWT to a single file nearly fell apart, a `jsonwebtoken.verify` call snug into `src/graphql/utils/middleware/isAuth.ts`.
Lets beautify and strengthen TypeScript validation while we're at it...

## Revoke tokens for a user (change password)

Time to add a revoke method in order to invalidate tokens when password is changed:

- add `revokeRefreshTokens` in `src/utils/auth.ts`
- create (temporary) mutation for testing purposes

Now, refreshToken is invalidated by incrementing tokenVersion in the database on the User object.

Notice that the accessToken is still valid until it expires.

Wait, can't we revoke the accessTokens as well?

Yes, we can - but it requires a lookup in the database in order to compare tokenversion.

You should ask yourself: Is it worth adding an extra DB User lookup to every single website request?

If you decide that it _is_ worth it, here's how it can be done:

- add tokenVersion to the accessToken payload
- modify `revokeRefreshTokens` to also update the context when invalidation takes place
- add User lookup to the `isAuth` middleware function - be aware that it changes `isAuth` into an async function

## Confirmation email

This part is based on one of Ben Awad's [tutorials](https://www.youtube.com/watch?v=OP39UioapL8&list=PLN3n1USn4xlma1bBu3Tloe4NyYn9Ko8Gs&index=6).

Email confirmation before enabling login, requires:

- confirmation info stored in the database
- sending an email upon registration
- an extra check in login that disables login until the email confirmation is done
- a way to recieve the confirmation and enable login - a link/url with an identifier to confirm the user/email

Email is sent by using [nodemailer](https://www.npmjs.com/package/nodemailer) and the unique identifier is created with [uuid](https://www.npmjs.com/package/uuid)

Install nodemailer and uuid:

```
$ npm i nodemailer uuid
$ npm i -D @types/nodemailer @types/uuid
```

### Confirmation info stored in the database

Create a new DB table, `UserEmailConfirmation`, to store info about sent confirmation mails. Some email validations will most likely be lost - meaning that some user accounts will not be confirmed.

What would happen if a user registration request is never confirmed and never cleaned up? It would block that email from being used in the future - also, it would be a waste of 'dead space' carrying around useless logins.

Adding a timestamp to the database enables a way of cleaning up invalid user requests. A registration request should be confirmed within a short period of time - let's say 1-2 days. After that, a cleanup procedure should remove any unused registration attempts.

A basic `UserEmailConfirmation` table could look like this:

```
@ObjectType()
@Entity("UserEmailConfirmations")
export class UserEmailConfirmation extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  email: string;

  @Field()
  @Column("varchar", { unique: true, length: 36 })
  uuid: string;

  @Field()
  @Column({
    nullable: false,
    type: "timestamp",
    default: () => "DATE_ADD(NOW())",
  })
  createdAt: Date;
}
```

### Add email confirmation check to `login`

The login mutation already throws a few errors in case email or password is invalid. An extra check is added to verify that email is confirmed, thow an error otherwise.

### Send an email upon registration

`src/utils/sendConfirmationEmail.ts` is created. This is where nodemailer resides, where emails are created and confirmation info is stored in the database.

The `register` mutation calls `sendConfirmationEmail`. This way, an email is sent before returning the user.

### Recieve the confirmation and enable login

Confirming a new user email should always be a manual event, done by a person - not an automated integration API. Also, email confirmation is (hopefully) used rarely, compared to _day to day_ activities.

Are there any good reasons to add a `confirmEmail` mutation? Well, the only thing I can come up with, is if I create an email client myself, that use this API.

Please let me know, if you can provide solid arguments for adding email confirmation to GraphQL?

Right now, I choose to follow Ben Awad's [tutorial](https://www.youtube.com/watch?v=OP39UioapL8&list=PLN3n1USn4xlma1bBu3Tloe4NyYn9Ko8Gs&index=6) and add a `confirmEmail` mutation - which, by the way, makes manual testing a lot easier ... I would propably choose otherwise in real world scenarios.

### Confirmation Email endpoint

Endpoint for receiving emails is going to be: http://{proces.env.DOMAIN}:{proces.env.PORT}/users/confirm/:id

- URL endpoint is added to `src/index.ts`
- Method implementation og `confirmEmail` is placed beside the other email handling ... this might be subject to refactoring along the way.

## Reorganize TypeGraphQL Resolvers

`src/graphql/modules/user/User.resolver.ts` is bloated by now.

Testing will be added soon. Developing different tasks in parallel might cause messy version control. This project needs reorganizing to maintain order.

Requests/mutations that positively goes into production, are extracted into their own resolvers.

Queries/mutations:

- users() - Temporary dev/test
- getUser(email, password) - might be used in future code. Considered temporary dev/test until then
- login(email, password, context) - ready
- isAuthenticated(context) - Temporary dev/test
- revokeTokens(context) - relevant for reset/change password, refactor into two different mutations: `resetPassword` (using email) and `changePassword`
- register(firstname, lastname, email, password) - ready
- confirmEmail(uuid) - endpoint outside API
- userEmailCleanup() - not a customer task. why put this in an API??

Most of this is just dev/test junk. Only `register` and `login` are ready to go into their own resolvers.

- `src/graphql/modules/user/Login.resolver.ts`
- `src/graphql/modules/user/Register.resolver.ts`
- `src/graphql/modules/user/User.resolver.ts`

`src/graphql/utils/createSchema.ts` is updated accordingly.

## Reset Password

I believe resetting a password should be a fairly simple process-flow from the user's perspective:

- Push some kind of 'button'
- Type in new password (twice) and press 'Update' ... and voila, the password is updated!
- Redirect to login-/landing page when done

Resetting password is where I would expect hackers to search for vulnerabilities - I personally want to make this as safe as possible:

- involve user email in order to protect against hijacking
- reduce _window of opportunity_ to a short period of time
  - stealing an old email (with a link) is not an option:
    - link life span is limited to 1-2 days
    - link can only be used once, when password is updated, the link becomes invalid
  - session timeout on reset form - the time in which an attacker can try to steal and use a session

That makes my process flow look like this:

1. Push some kind of 'button'
2. receive an email with a link that only works for a short period of time (1-2 days, then the uuid will be deleted by automatic cleanup)
3. activate link from email
4. type in new password (twice) and press the 'Update' button ... and voila, the password is updated!
5. redirect to login-/landing page when done

This _Reset Password_ endpoint is not just _any_ new endpoint, it has some extra restrictions:

- it is unique to a specific user/email
- it presents a password form to the user, we need to make sure only the right person is allowed access
- it has a session timeout - meaning that the form submit must include a JWT token

Several tasks line up already.

### Multiple kinds of user emails - refactor to handle different kinds of email

- rename DB table `UserEmailConfirmations` to something more generic: `userEmail`
- add emailtype to `userEmail` - the field 'reason' is introduced
- rename `src/utils/sendConfirmationEmail.ts` to something more generic: `src/utils/sendEmail.ts`
- refactor `src/utils/sendEmail.ts` to handle several kinds of tasks

### New process-flow

- add **resetPasswordToken** with expiration time: 5 minutes (to type in password twice and click 'Update')
- add **resetPasswordEmail** to `src/utils/sendEmail.ts`
- new TypeGraphQL resolver to initiate _Reset Password_ flow: `src/graphql/modules/user/ResetPassword.resolver.ts`
- add GET endpoint to provide user with _Reset Password_ form: http://localhost:4000/user/resetpwd/:uuid
  - resetPasswordToken is provided in a new cookie with options [{ httpOnly: true, sameSite: 'strict' }](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)
  - password credentials are validated before 'Update' button is enabled (for now, simply that the two typed in passwords are the same)
- add POST endpoint to handle user response from _Reset Password_ form: http://localhost:4000/user/resetpwd/:uuid
  - url uuid is used to identify userEmail in DB
  - token (from cookie) is used to identify user in DB.
  - cross-referencing uuid and token in order to make cheating harder
  - token is used to verify timespan
- new **verifyPasswordReset** to update password
- redirect to login/landing page on success

### Creating a safe user dialog, GET and POST endpoints with authorization

This turned out to be more tricky than I expected.

1. Express itself doesn't cooporate by default. Receiving Form content requires an extra package:

   - add [body-parser](https://www.npmjs.com/package/body-parser) as middleware to express

2. CORS also require an extra package:

   - add [cors](https://www.npmjs.com/package/cors) as middleware to express

3. Authorization: an email link is activated. The client/browser is unknown, there's no entry conditions, like a cookie or something - starting point is the uuid in that email-link.
   - create a cookie with resetToken (timeout is 5 minutes from the link is activated)
   - GET presents an Input Form to type password twice - 'Update' button is enabled when the password credentials are met (for now, typed values are equal)
   - create an XMLHttpRequest, send password to POST endpoint through that XMLHttpRequest-dialog
     - CORS options ensure that POST only receives request from one known domain: localhost:4000
     - cookie options ensure that the token is 'read-only' to javascript (httpOnly=true) and the cookie is only sent to the site where it originated (SameSite=Strict)
   - POST endpoint uses uuid from url + cookie from GET to verify user identity
   - POST responds back to GET through the XMLHttp-dialog
   - GET responds back to the user/browser
   - if update succeeded:
     - delete cookies: resetCookie and, if present, refreshCookie which is invalid by now
     - delete uuid from email-link (one-time-only)
     - redirect to login/landing page
   - in case of error:
     - uuid is preserved and link is active until update is successful
     - resetToken/cookie is deleted, a new resetToken is created on link activation
     - if other reset emails are sent - only the last email is active (previous uuid values are removed)

### Validate new password

POST request is handled by `src/utils/verifyPasswordReset.ts`:

- url uuid is used to identify userEmail in DB
- token (from cookie) is used to identify user in DB.
- cross-reference uuid and token to make cheating harder
- token is used to verify timespan
- On succees:
  - password is hashed
  - user is updated
  - uuid is deleted
- On error:
  - anonymous error is thrown, user might be looking for a vulnerabilities

To me, the hard part here was definitely the http dialog - a combination of token, cookie, XmlHttp, Express middleware to provide security ... and of course (important) a smooth user dialog!!

## Reorganize project - routes, controllers, middleware, graphql

`src/index.ts` looks really messy by now. Time to introduce routers and controllers!

Since I am going to have both REST and GraqphQL endpoints in one API, I want to collect GraphQL-specific content in `src/graphql`.

Having REST endpoints also makes it relevant to distinguish between ORM and GraphQL.

GraphQL specific utils is moved to `src/graphql/utils` - I am not really sure if this is _too much_ splitting up or if it's nice and clean... I guess it depends on the project size. Refactoring is always an option.

New project folder structure is this:

```
src/
    controllers/
        users/
    graphql/
        modules
            user/
        utils/
            middleware/
    orm/
        entity/
        migration/
    routes/
        users/
    utils/
        middleware/
    index.ts
```

Endpoints in `src/index.ts` are reorganized (removed from index.ts)

- Routes are placed in `src/routes/`
- controllers are placed in `src/controllers/`
- endpoint constants are removed from `src/utils/sendEmails.ts`, they are now exported from `src/routes/user/index.ts`
- authorization (non-graphql) is reorganized and added to express endpoints as route-level middleware: `src/utils/middleware/isAuth.ts`

Other minor changes:

- Reset Password cookie timeout: 5 minutes
- Reset Password form timeout - resetPasswordTimeout() added to form

## Automated test - Jest

Inspired by [this tutorial](https://www.youtube.com/watch?v=fxYcbw56mbk&list=PLN3n1USn4xlma1bBu3Tloe4NyYn9Ko8Gs&index=9).

Overall goal is to reach almost 100% code coverage (being flexible and reasonable).

Part of the agile mindset is:

1. build what is necessary - not more than that
2. refactor in allignment with new requirements

Unittesting with 100% code coverage is vital to refactoring on-the-fly.

### Setup environment

- Ensure a well defined starting point

  - use a testing database that doesn't mess up data related to production, staging, development or demo
  - reset testing database on new test-run

- Cover all endpoints

  - GET "/user/confirm/:id"
  - POST "/renew_accesstoken"
  - GET "/user/resetpwd/:id"
  - POST "/user/resetpwd/:id"
  - GraphQL endpoints
  - REST endpoints

- Add utils testing where needed - or if it helps better understanding

### Docker database setup

Create test-DB and add needed privileges to DB-user:

1. Open database conection, <span style="text-decoration: underline">Login as root</span>
2. create new database: 'sandbox-test'
3. manage user access rights, select user 'user'
   - add new object: database 'sandbox-test'
   - grant all rights except for GRANT
   - save and close user management

Databases 'sandbox' and 'sandbox-test' are now available in the same docker container on localhost.

## Testing [using ts-jest](https://www.npmjs.com/package/ts-jest)

```
$ npm i -D typescript jest ts-jest @types/jest
$ npx ts-jest config:init
```

### Commands in package.json

Reset database before running unittests (creating test coverage reports):

> `npm run resetdb`

Run unittests once:

> `npm run test`

Variations to be used during development:

- `npm run test -- --watchAll` - Add the 'watchAll' flag and run tests automatically when files are changed
- `npm run test -- --coverage` - Add 'coverage' flags to create a test coverage report
- `npm run test -- --watchAll --coverage` - Add both 'watchAll' and 'coverage flags during development

Reset database, run unittests once and create a test coverage report:

> `npm run coverage`

### Random testdata using [faker](https://www.npmjs.com/package/faker)

```
$ npm i -D faker @types/faker
```

## First GraphQL resolver Test - Register

The basic GraphQL test setup is verified by `src/graphql/modules/Register.test.ts`.

### test-utils

1. `src/test-utils/testConn.ts`
2. `src/test-utils/resetTestDB.ts`
3. `src/test-utils/gqlCall.ts`

To run tests in a separate database, a new `createConnection` is added in `testConn.ts`. Configuration options include both 'synchronize: true' and 'dropSchema: true'.

Database reset with package.json commands are enabled by adding `resetTestDB.ts`.

The GraphQL schema is called directly during tests (easiest way to test resolvers). To reduce redundancy, setting up graphql(...) is placed in the helper-functiong: `gqlCall.ts`.

### `src/test-utils/gqlCall.test.ts`

This might be redundant since resolver testing most likely will provide 100% code coverage (or very close).

I still choose to add it since it helps my understanding and provides a systematic walk-through of the helper-function.

## REST endpoint Testing: GET landing page + POST Renew accessToken

Separate app.ts from `src/index.ts` in order to use `src/app.ts` in test suites.

Install [SuperTest](https://www.npmjs.com/package/supertest)

```
$ npm i -D supertest @types/supertest
```

The basic REST test setup is verified by `src/routes/routes.test.ts`.

### User test - `src/routes/user/index.ts`

Next step is adding `src/routes/user/user.test.ts`.

User endpoint testing shows clearly that authorization works but the response is unacceptable:

- http statuscode 500 is not what I want on 'unauthorized' or 'access denied' responses
- An error message with a stacktrace should never be visible to the client

Errorhandling [as middleware](https://wanago.io/2018/12/17/typescript-express-error-handling-validation/) is needed.

### Authorization and errorhandling

1. An Error extension helper class, `src/utils/httpError.ts`, is created in order to add HTTP status whenever an error is thrown

2. Express errorMiddleware is provided in `src/utils/middleware/error.ts`

3. Middleware is applied last in the middleware chain in `src/app.ts`

4. All error handling is converted to use the new `HttpError`

## TypeORM Migrations

The database layout needs to be synchronized with the TypeORM models.
Moving the project into production requires ability to maintain data while upgrading DB layout - [TypeORM Migrations](https://typeorm.io/#/migrations) does exactly that.

Project strategy is this:

- .env.development - allows building new TypeORM Entities (database models) which is synchronized into the database
- .env.test - requires migrations (synchronize = false)
- .env.staginglocal - requires migrations (synchronize = false)
- .env.staging - requires migrations (synchronize = false)
- .env.prod - requires migrations (synchronize = false)

In order to organize the project workflow/lifecycle and keep track of build/deployment strategy, environment specific commands are added to `package.json`.

This way I am allowed to customize settings (DB login), compiler options (TypeScript sourceMap) etc.

### Reset Test DB

While `package.json`'s script section is heavily modified, database reset is also altered. The previous `src/test-utils/resetTestDB.ts` is removed in exchange with environment specific commands.

### `instanceof` - JavaScript vs Typescript

Introducing staging environment means running the test suite on distribution code. _Good idea!_

It turned out, I had a bug that was actually pretty hard to find ...

1.  All tests worked fine until testing staginglocal, the distribution code
2.  Complexity in environment settings, database permissions, command similarities/differences in `package.json` - lots of stuff could be wrong here
3.  indications point in the direction of an issue related to TypeORM entities
    - I tried changing `TYPEORM_ENTITIES` from **dist**/orm/entity/\*\*/**\*.js** to **src**/orm/entity/\*\*/**\*.ts**
    - that change made all tests run smoothly again.
4.  ...but then again - not ALL tests failed, only a bunch of them failed !?

It turned out that `src/utils/sendEmail.ts` had a conditional behaviour using `instanceof` on the typeORM return value.

Here's the key:

- in Typescript, instanceof is used to test the data type definitions
- In Javascript, instanceof searches for type references in the prototype constructor chain (super classes included) - meaning that if the class was never instantiated (using the keyword `new` &lt;Entity&gt;), `instanceof` will return `false`.
- when referring `TYPEORM_ENTITIES` = **src**/orm/entity/\*\*/**\*.ts**, the jest runtime uses Typescript webpack configuration
- when referring `TYPEORM_ENTITIES` = **dist**/orm/entity/\*\*/**\*.js**, the jest runtime uses JavaScript webpack configuration

That's why the bug didn't show until running the dist code.

## Logging

Logging errors is important - but logging is also a balance... heavy logging narrows the time frame for logging (if the file size is limited as it should be).

I've been playing around with two implementations:

- winston + morgan
- winston + winston-express

Both methods are added to the repository since I am not sure about which one is prefered. The current settings use winston + winston-express.

Also, the settings applied is kind of heavy - this is because I find it easier to remove than to add.

I would propably go for a database/http logger in a real case scenario - adding another handler is considered low priority for now.

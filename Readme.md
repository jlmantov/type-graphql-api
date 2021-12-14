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

While re-arranging the code, `src/modules/user/UserResolver.ts` is provided to verify that everything still works:

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



### Create User mutation in GraphQL

Modify `src/entity/User.ts`

1. Add email, salt and password to DB
2. In order to make type-graphql understand the datastructure, add @ObjectType to entity
3. add name (combined firstName & lastName) as a schema field which is not stored in DB ... just for the fun of it

Modify `src/modules/user/UserResolver.ts`



## Login and create access/refresh tokens



## Authenticated mutations and queries



## Refresh the token



## Revoke tokens for a user (change passord)



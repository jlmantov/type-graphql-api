# Further reading and studying ... go ahead and knock yourself out

## YouTube tutorials

- JWT Authentication Node.js Tutorial with GraphQL and React - [Ben Awad](https://www.youtube.com/watch?v=25GS0MLT8JU)
- TypeGraphQL Setup - [Ben Awad](https://www.youtube.com/watch?v=8yZImm2A1KE&list=PLN3n1USn4xlma1bBu3Tloe4NyYn9Ko8Gs)
- TypeScript REST API - [Kris Foster](https://www.youtube.com/playlist?list=PLdk2EmelRVLpIdCFolrwdLhCTHyeefU6W)

## Articles/guidelines

### Organizing project folders
I intend to organize my project folder structure, following this pattern: [Fractal — A react app structure for infinite scale](https://hackernoon.com/fractal-a-react-app-structure-for-infinite-scale-4dab943092af)

I have also thought about [how to organize and store accounts, emails and personal settings](./userprofile-howto.md)


### Development

- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [Introduction to GraphQL](https://graphql.org/learn/)
- [TypeGraphQL Docs](https://typegraphql.com/docs/introduction.html)
- [TypeORM](https://typeorm.io/#/)
- [Building a CRUD-backend with GraphQL, TypeScript and TypeGraphQL](https://dev.to/lastnameswayne/building-a-crud-backend-with-graphql-typescript-and-typegraphql-4h71)
- [How to use GraphQL with Postman – Postman testing with GraphQL](https://www.apollographql.com/blog/tooling/graphql-ide/how-to-use-graphql-with-postman/)
- [GraphQL Clients](https://graphql.org/graphql-js/graphql-clients/)

- [node-argon2](https://www.npmjs.com/package/argon2)
- [node-argon2 Options](https://github.com/ranisalt/node-argon2/wiki/Options)
- [Building a password hasher in Node.js](https://blog.logrocket.com/building-a-password-hasher-in-node-js/)
- [tabnine: How to use hash function in argon2](https://www.tabnine.com/code/javascript/functions/argon2/hash)

- [Express](https://expressjs.com/)
- [Apollo Server](https://www.apollographql.com/docs/apollo-server/integrations/#apollo-server-express)
- [Apollo Server middleware](https://www.apollographql.com/docs/apollo-server/integrations/middleware/#apollo-server-express)
- [POST JSON With Bearer Token Authorization Header [JavaScript/AJAX Code]](https://reqbin.com/req/javascript/h4rnefmw/post-json-with-bearer-token-authorization-header)
- [Postman - Working with GraphQL - Using JSON request body](https://documenter.getpostman.com/view/11644629/TVCcWUHu#711cbee3-46b4-4520-a49d-867c1ad9e87f)
- [Cross-Origin Resource Sharing (CORS)](https://web.dev/cross-origin-resource-sharing/)
- [Making a CORS Request - HTML5 Rocks](https://www.html5rocks.com/en/tutorials/cors//)
- [Express cors middleware](https://expressjs.com/en/resources/cors.html)
- [MDN Express Tutorial Part 4: Routes and controllers](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/routes)

- [body-parser](https://www.npmjs.com/package/body-parser)
- [graphql-tag](https://www.npmjs.com/package/graphql-tag)

- [Nodemailer](https://nodemailer.com/about/)



### Test

- [JEST - Getting started](https://jestjs.io/docs/getting-started)
- [JEST - a JavaScript Testing Framework](https://jestjs.io/docs/27.0/api)
- [ts-jest - Github Docs](https://kulshekhar.github.io/ts-jest/docs/) - [npm](https://www.npmjs.com/package/ts-jest)
- [faker.js - generate fake data in the browser and node.js](https://www.npmjs.com/package/faker)
- [RIP Tutorial - jest (ts-jest)](https://riptutorial.com/typescript/example/29207/jest--ts-jest-)
- [Node.js (Express) with TypeScript, Eslint, Jest, Prettier and Husky - Part 3](https://dev.to/ornio/node-js-express-with-typescript-eslint-jest-prettier-and-husky-part-3-1l8c)
- [Testing Typescript Api With Jest and Supertest](https://tutorialedge.net/typescript/testing-typescript-api-with-jest/)



## Considerations with regard to Cookie vs. JWT token
I consider JWT the most common way of authenticating users - that alone is a strong reason why to choose this approach.

I'd still like to know the alternatives and their consequences - in order to choose direction!

- I find this article useful: [Web Authentication: Cookies vs. Tokens](https://blog.bitsrc.io/web-authentication-cookies-vs-tokens-8e47d5a96d34)
- and this tutorial: GraphQL Typescript Server Boilerplate - [Ben Awad](https://www.youtube.com/playlist?list=PLN3n1USn4xlky9uj6wOhfsPez7KZOqm2V)


### The Cookie approach
- [dev.to: How to easily implement Authentication with GraphQL and Redis](https://dev.to/lastnameswayne/how-to-implement-authentication-with-graphql-and-redis-1k1b)
- [Redis with Node.js (ioredis)](https://docs.redis.com/latest/rs/references/client_references/client_ioredis/)
- [npm ioredis](https://www.npmjs.com/package/ioredis)

Let's face it, a session table in a database is also a useful option - as an alternative to introducing Redis. Many solutions work really well this way (added complexity comes with a cost).


Considering that JWT saves me from session storage, I choose to carry on with JWT.



## Authentication and Authorization

- Google Clod - [13 best practices for user account, authentication, and password management, 2021 edition](https://cloud.google.com/blog/products/identity-security/account-authentication-and-password-management-best-practices)

- OWASP Cheet Sheet Series - [Password Storage Cheat Sheet #argon2id](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id)
- OWASP Cheet Sheet Series - [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- OWASP Cheet Sheet Series - [Multi-Factor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- OWASP Cheet Sheet Series - [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

- [Web Authentication: Cookies vs. JWT tokens](https://blog.bitsrc.io/web-authentication-cookies-vs-tokens-8e47d5a96d34)
- [Authenticate REST APIs in Node JS using JWT (Json Web Tokens)](https://medium.com/@prashantramnyc/authenticate-rest-apis-in-node-js-using-jwt-json-web-tokens-f0e97669aad3)

- [JSON Web Tokens](https://jwt.io/)

- Google Clod MFA - [Adding multi-factor authentication to your web app](https://cloud.google.com/identity-platform/docs/web/mfa)
- [Authy vs. Google Authenticator](https://authy.com/blog/authy-vs-google-authenticator/)

- [Add Github Login to Your Web App with OAuth 2.0](https://egghead.io/courses/add-github-login-to-your-web-app-with-oauth-2-0-74a92b57)

- MDN Web Docs - [Securing your site](https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site)


- OWASP Cheet Sheet Series - [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- OWASP Cheet Sheet Series - [Authorization Testing Automation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Testing_Automation_Cheat_Sheet.html)
- OWASP Cheet Sheet Series - [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- OWASP Cheet Sheet Series - [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- OWASP article - [Handle all Errors and Exceptions](https://owasp.org/www-project-proactive-controls/v3/en/c10-errors-exceptions.html)


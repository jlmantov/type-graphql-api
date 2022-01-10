import express from "express";
import "reflect-metadata";
import router from "./routes/index";
import errorMiddleware from "./utils/middleware/error";

/**
 * In order to allow REST endpoint testing, Express server is extracted into app.ts
 */
const app = express();

// Route-level middlware: http://expressjs.com/en/guide/using-middleware.html#middleware.router
// root-level endpoints are defined in src/routes/index.ts (which includes deeper relative endpoint definitions)
app.use("/", router);

// Important: Error handling needs to be last middleware in the chain
app.use(errorMiddleware);

export default app;

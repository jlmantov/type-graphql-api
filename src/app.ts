import "dotenv/config";
import express from "express";
import "reflect-metadata";
import router from "./routes/index";

/**
 * In order to allow REST endpoint testing, Express server is extracted into app.ts
 */
const app = express();

// Route-level middlware: http://expressjs.com/en/guide/using-middleware.html#middleware.router
// root-level endpoints are defined in src/routes/index.ts (which includes deeper relative endpoint definitions)
app.use("/", router);

export default app;

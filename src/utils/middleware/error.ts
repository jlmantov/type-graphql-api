import { NextFunction, Request, Response } from "express";
import HttpError from "../httpError";

function errorMiddleware(
  error: HttpError,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  const status = error.status || 500;
  // const name = error.name || "Internal Server Error";
  let message = error.message || "Something went wrong";

  // console.log("error.middleware " + error.status + ": " + error.name + " - " + error.message);
  // generalize error message - no matter what deeper layers might have reported
  switch (status) {
    case 400:
      message = "Expired or invalid input";
      break;
    case 401:
      message = "Not authenticated";
      break;
    case 403:
      message = "Access expired, please login again";
      break;
    default:
      message = "Something went wrong";
  }
  response.status(status).send(message);
}

export default errorMiddleware;

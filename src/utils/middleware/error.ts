import { NextFunction, Request, Response } from "express";
import HttpError from "../httpError";

function errorMiddleware(
  error: HttpError,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  let status = error.status || 500; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
  // let name = error.name || "Internal Server Error";
  let message = error.message || "Something went wrong";

  // console.log("error.middleware " + error.status + ": " + error.name + " - " + error.message);
  // 1. log error, what deeper layers might have reported
  // 2. generalize error message - discreet, polite and protective against malign attackers
  if (error.status >= 500) {
    // Server error - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses
    status = 500;
    // name = "Internal Server Error";
    message = "Something went wrong";
  } else if (error.status >= 400) {
    // Client error - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses
    if (error.status === 403) {
      // name = "Forbidden";
      message = "Access expired, please login again";
    } else if (error.status === 401) {
      // name = "Unauthorized";
      message = "Not authenticated";
    } else  {
      status = 400;
      // name = "Bad Request";
      message = "Expired or invalid input";
    }
  } else {
    // Allow status + message to pass through
    //
    // status >= 300 - Redirection messages
    // status >= 200 - Successful responses
    // status >= 100 - Information responses
  }
  response.status(status).send(message);
}

export default errorMiddleware;

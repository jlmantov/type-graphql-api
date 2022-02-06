import { NextFunction, Request, Response } from "express";
import HttpError from "../httpError";

function errorMiddleware(
  error: HttpError,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  let status = error.status || 500; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
  let message = error.message || "Something went wrong";

  // 1. Error is already logged
  // 2. Generalize response message - discreet, polite and protective against malign attackers

  // status >= 100 - Information responses
  // status >= 200 - Successful responses
  // status >= 300 - Redirection messages

  if (error.status >= 400) {
    // Client error - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses
    status = 400; // "Bad Request";
    message = "Expired or invalid input";
  }
  if (error.status === 401) {
    status = 401; // "Unauthorized";
    message = "Not authenticated";
  }
  if (error.status === 403) {
    status = 403; // "Forbidden";
    message = "Access expired, please login again";
  }

  if (error.status >= 500) {
    // Server error - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses
    status = 500; // "Internal Server Error";
    message = "Something went wrong";
  }

  response.status(status).send(message);
}

export default errorMiddleware;

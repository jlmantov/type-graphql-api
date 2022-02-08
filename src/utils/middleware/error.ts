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

  // Client error - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    // status 400 message are allowed to pass through (ex.: "Email needs to be confirmed in order to enable login")
    status = error.status;
    message = error.message;
  }
  if (error.status > 400 && error.status !== 401 && error.status !== 403) {
    status = 400; // BadRequestError - The server could not understand the request due to invalid syntax
    message = "Expired or invalid input"; // e.g.: deleted/outdated uuid
  }

  // Server error - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses
  if (error.status >= 500) {
    status = 500; // InternalServerError
    message = "Something went wrong";
  }

  response.status(status).send(message);
}

export default errorMiddleware;

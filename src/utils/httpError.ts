import logger from "./middleware/winstonLogger";

class HttpError extends Error {
  status: number;
  name: string;
  message: string;
  constructor(status: number, name: string, message: string, error?: Error) {
    super(message);
    this.status = status;
    this.name = name;
    this.message = message;
    logger.error(message, { label: "HttpError", status, name, error }); // 2. param is logged as metada: { label: "HttpError", status, name, message }
    switch (status) {
      case 400:
        this.name = "BadRequestError";
        // this is a more general error - allow message to slip through
        break;
      case 401:
        this.name = "AuthorizationError";
        this.message = "Expired or invalid input";
        break;
      case 403:
        this.name = "AuthorizationError";
        this.message = "Access expired, please login again"; //
        break;
      case 500:
        this.name = "InternalServerError";
        this.message = "Something went wrong";
        break;
    }
  }
}

export default HttpError;

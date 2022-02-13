import logger from "./middleware/winstonLogger";

class HttpError extends Error {
  status: number;
  name: string;
  message: string;
  constructor(status: number, name: string, message: string, error?: any) {
    super(message);
    this.status = status;
    this.name = name;
    this.message = message;
    const metadata: { label: string; status: number; name: string; error?: any } = {
      label: "HttpError",
      status,
      name,
      error,
    };
    logger.error(message, metadata); // 2. param is logged as metadata: { label: "HttpError", status, name, message, error }
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

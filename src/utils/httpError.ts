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
  }
}

export default HttpError;

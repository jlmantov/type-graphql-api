import morgan, { StreamOptions } from "morgan";
import winstonLogger from "./winstonLogger";

// fetch logging config from .env
const skip = () => {
  const logingEnabled = process.env.HTTP_LOGGING?.trim().toLowerCase() || "false";
  return logingEnabled === "true";
};

// Build the morgan middleware
export const logformat = {
  //   date: ":date[clf]",
  method: ":method",
  url: ":url",
  status: ":status",
  referrer: ":referrer",
  result_length: ":res[content-length]",
  response_time: ":response-time",
  remote_addr: ":remote-addr",
  remote_user: ":remote-user",
  http_version: ":http-version",
  user_agent: ":user-agent",
};

// Override the stream, tell Morgan to send messages to winstonLogger instead of console.log
const morganStream: StreamOptions = {
  write: (message) => winstonLogger.http(message),
};

const morganHttpLogger = morgan(
  JSON.stringify(logformat),
  // Define message format string (this is the default one).
  // The message format is made from tokens, and each token is defined inside the Morgan library.
  // You can create your custom token to show what do you want from a request.
  //   ":method :url :status :res[content-length] - :response-time ms",

  // Options: in this case, stream and skip logic is overwritten.
  // See the methods above.
  { stream: morganStream, skip }
);

export default morganHttpLogger;

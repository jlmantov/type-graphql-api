import dotenv from "dotenv";
import expressWinston from "express-winston";
import winston from "winston";
import TransportStream from "winston-transport";

// inspiration: https://sujaykundu.com/blog/setting-up-custom-logger-for-node-express-typescript-server/

// specifically add logging - default is production
const envfile = __dirname + "/../../../.env." + (process.env.NODE_ENV?.trim() || "production");
dotenv.config({ path: envfile });

// log levels system
const levels = {
  critical: 0,
  error: 1,
  warn: 2,
  http: 3,
  info: 4,
  verbose: 5,
  debug: 6,
  silly: 7,
};

const level = () => {
  const loglevel = process.env.HTTP_LOGLEVEL?.trim().toLowerCase() || "";
  const levels = ["critical", "error", "warn", "http", "info", "verbose", "debug", "silly"];
  if (levels.indexOf(loglevel) > -1) {
    return loglevel;
  }
  return "warn"; // default ('server started' message + errors)
};

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  verbose: "white",
  debug: "gray",
  silly: "gray",
});

// const myFileFormat = (info: any) => {
//   const label = "" + !!info.label && JSON.stringify(info.label);
//   const message = "" + !!info.message && JSON.stringify(info.message);
//   const metadata = "" + !!info.metadata && JSON.stringify(info.metadata);
//   const error = "" + !!info.error && JSON.stringify(info.error);
//   const symbols = Object.getOwnPropertySymbols(info); // Symbol(message) and Symbol(level)

//   let str = info.timestamp + " ";
//   str += label && label !== "" ? "[" + label + "] " : "";
//   str += info.level + ": ";
//   if (symbols.length > 0) {
//     for (const sym of symbols) {
//       const obj = JSON.stringify(info[sym]);
//       // console.log("obj json:", JSON.stringify(obj));
//       console.log("obj", obj);
//       const val = info[sym];
//       str += "\n  " + val;
//     }
//   }
//   str += message && message !== "" ? "\n  " + message : "";
//   str += metadata && metadata !== "{}" ? "\n  " + metadata : "";
//   str += error && error !== "" ? "\n  " + error : "";
//   return str.trim();
// };

let loggerTransports: TransportStream[] = [
  new winston.transports.File({
    filename: "all.log",
    dirname: "logs",
  }),
];

// File logging - https://github.com/winstonjs/winston/blob/master/docs/transports.md#file-transport
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.metadata(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.ms" }),
    winston.format.json()
    // winston.format.printf(myFileFormat)
    // winston.format.prettyPrint()
  ),
  transports: loggerTransports,
  exitOnError: false,
});

// Handle Uncaught Promise Rejections - https://github.com/winstonjs/winston#handling-uncaught-promise-rejections-with-winston
logger.rejections.handle(
  new winston.transports.File({
    filename: "rejections.log",
    dirname: "logs",
  })
);

// https://github.com/bithavoc/express-winston#request-logging
export const winstonHttpLogger = expressWinston.logger({
  transports: loggerTransports,
  format: winston.format.combine(
    winston.format.metadata(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.ms" }),
    winston.format.json()
    // winston.format.printf(myFileFormat)
    // winston.format.prettyPrint()
  ),
  expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
  colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  // msg: "HTTP {{req.ip}} {{req.hostname}} {{req.method}} {{req.url}} {{req.path}} {{req.protocol}} {{req.httpVersion}} {{req.params}} {{req.headers}} {{req.body}} {{req.query}} {{req.app}} {{res.cookies}} {{res.body}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
  // msg: "{{res.statusCode}} {{req.method}} {{req.url}} {{req.protocol}} {{req.httpVersion}} {{req.hostname}} - {{res.responseTime}}ms",
});

export const winstonErrorLogger = expressWinston.errorLogger({
  transports: [
    new winston.transports.File({
      filename: "error.log",
      dirname: "logs",
    }),
  ],
  format: winston.format.combine(
    winston.format.metadata(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.ms" }),
    winston.format.json()
    // winston.format.printf(myFileFormat)
    // winston.format.prettyPrint()
  ),
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  // optional: customize the default logging message. E.g. msg: "HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}",
  msg: "{{res.statusCode}} {{req.method}} {{req.url}} {{req.protocol}} {{req.httpVersion}} {{req.hostname}} - {{res.responseTime}}ms",
});

logger.verbose(
  "winstonLogger - NODE_ENV: " + process.env.NODE_ENV + ", DOMAIN: " + process.env.DOMAIN
);

export default logger;

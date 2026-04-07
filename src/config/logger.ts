import bunyan, { LogLevelString } from "bunyan";
import bformat from "bunyan-format";
import { env } from "./env";

const level: LogLevelString = env.NODE_ENV === "production" ? "info" : "debug";

const stream =
  env.NODE_ENV === "production"
    ? process.stdout
    : bformat({
        outputMode: "short",
        color: true,
      });

export function createLogger(name: string) {
  return bunyan.createLogger({
    name,
    level,
    serializers: bunyan.stdSerializers,
    stream,
  });
}

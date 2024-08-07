import { strict as assert } from "assert";

export const checkEnv = (envName: string, defaultValue?: string) => {
  const env = process.env[envName] ?? defaultValue;
  if (env) {
    return env;
  }
  assert.notStrictEqual(env, undefined, `${envName} is not specified`);
  return env as string;
};

export const config = {
  rateLimit: Number.parseInt(checkEnv("RATE_LIMIT", "100")),
  minBlockNum: Number.parseInt(checkEnv("MIN_BLOCK_NUMBER", "0")),
};

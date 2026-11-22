import { execFileSync } from "child_process";

execFileSync(
  process.execPath,
  [require.resolve("@subsquid/typeorm-migration/lib/apply")],
  { stdio: "inherit" },
);

require("./main");

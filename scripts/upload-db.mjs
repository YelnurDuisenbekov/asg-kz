import { readFileSync } from "fs";
import { put } from "@vercel/blob";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const token = env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  throw new Error("BLOB_READ_WRITE_TOKEN not found in .env.local");
}

const body = readFileSync("data/db.json");
const res = await put("db.json", body, {
  access: "private",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
  cacheControlMaxAge: 0,
  token,
});

console.log("uploaded", res.pathname);

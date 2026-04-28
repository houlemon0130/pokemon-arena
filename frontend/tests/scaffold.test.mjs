import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("front-end scaffold matches battle arena baseline", () => {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(packageJson.dependencies.phaser, "3.80.1");
  assert.equal(packageJson.dependencies.zustand, "5.0.2");
  assert.equal(packageJson.dependencies["framer-motion"], "11.15.0");

  assert.equal(
    read(".env.local").trim(),
    [
      "NEXT_PUBLIC_API_URL=http://localhost:8000",
      "NEXT_PUBLIC_WS_URL=ws://localhost:8000",
    ].join("\n"),
  );

  assert.equal(
    read("Dockerfile").trim(),
    [
      "FROM node:20-alpine",
      "WORKDIR /app",
      "COPY package*.json ./",
      "RUN npm install",
      "COPY . .",
      'CMD ["npm", "run", "dev"]',
    ].join("\n"),
  );

  assert.equal(
    read("src/app/globals.css").trim(),
    [
      "@tailwind base;",
      "@tailwind components;",
      "@tailwind utilities;",
      "",
      "* { box-sizing: border-box; margin: 0; padding: 0; }",
      "body { background: #0a0a0a; color: #e0e0e0; min-height: 100vh; }",
    ].join("\n"),
  );

  const page = read("src/app/page.tsx");
  assert.match(page, /return null;/);
  assert.doesNotMatch(page, /next\/image|Deploy now|Read our docs|nextjs\.org/);
});

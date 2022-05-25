import { Express } from "express";
import { ExportedEndpoint } from "./const";
import getFrapiEndpoints from "./endpoints";

const fs = require("fs/promises");

export default async function saveToFile(app: Express, path: string, generator = "js", options = {}) {
  if (!path) {
    throw new Error("Missing frapi output file path");
  }

  const generatorFunction =
    // @ts-ignore
    typeof generator === "function" ? generator : generators[generator];

  if (!generatorFunction) {
    throw new Error("Invalid generator function");
  }

  const endpoints = getFrapiEndpoints(app);
  const content = generatorFunction(endpoints, options);
  await fs.writeFile(path, content);
}

const generators = {
  js: jsGenerator,
  ts: tsGenerator,
};

function jsGenerator(endpoints: ExportedEndpoint[]) {
  let data = "";

  for (const endpoint of endpoints) {
    const args = [...endpoint.params, endpoint.query ? "query" : "", endpoint.body ? "body" : ""].filter(Boolean);

    data += `export async function ${endpoint.name}(${args.join(", ")}) {
  return fetch(\`${endpoint.path}\`, { method: '${
      endpoint.method
    }',  headers: { 'Content-Type': 'application/json' }, ${endpoint.body ? "body: JSON.stringify(body), " : ""}});
}\n\n`;
  }
  return data;
}

function tsGenerator(endpoints: ExportedEndpoint[]) {
  let data = "";

  for (const endpoint of endpoints) {
    const args = [
      ...endpoint.params.map((param) => `${param}: string`),
      endpoint.query ? "query: Record<string, string>" : "",
      endpoint.body ? "body: any" : "",
    ].filter(Boolean);

    data += `export async function ${endpoint.name}(${args.join(", ")}) {
  return fetch(\`${endpoint.path}\`, { method: '${
      endpoint.method
    }',  headers: { 'Content-Type': 'application/json' }, ${endpoint.body ? "body: JSON.stringify(body), " : ""}});
}\n\n`;
  }
  return data;
}

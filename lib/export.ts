import { Express } from "express";
import { ExportedEndpoint } from "./const";
import getFrapiEndpoints from "./endpoints";
import generateTypes from "./generate-types";

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
  ts: tsGenerator
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
    if (!endpoint.name) {
      continue;
    }

    const query = endpoint.query
      ? `query: ${endpoint.query === true ? "Record<string, string>" : generateTypes(endpoint.query)}`
      : "";

    const body = endpoint.body ? `body: ${endpoint.body === true ? "any" : generateTypes(endpoint.body)}` : "";
    const result = !endpoint.response ? null : endpoint.response === true ? "any" : generateTypes(endpoint.response);
    const args = [...endpoint.params.map(param => `${param}: string`), query, body].filter(Boolean);

    data += `export async function ${endpoint.name}(${args.join(", ")}) {
    const response = await fetch(\`${endpoint.path}\`, { method: '${
      endpoint.method
    }',  headers: { 'Content-Type': 'application/json' }, ${endpoint.body ? "body: JSON.stringify(body), " : ""}});
    const responseBody = ${!!result ? `(await response.json()) as ${result}` : "null"};
    return { ok: response.ok, status: response.status, body: responseBody, headers: response.headers, response };
}\n\n`;
  }
  return data;
}

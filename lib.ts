import type { Express } from "express";
import RandExp from "randexp";
import fs from "fs/promises";

const optionsSymbol = Symbol();

type PathPart = {
  type: "separator" | "string" | "param";
  text?: string;
};

type Options = {
  name: string;
  query: boolean;
  body: boolean;
};

function parsePath(path: string) {
  const parts: PathPart[] = [];
  let text = "";

  function addStringPart() {
    if (text) {
      parts.push({ type: "string", text });
      text = "";
    }
  }

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    switch (char) {
      case "\\":
        i++;
        text += char;
        break;
      case "/":
        addStringPart();
        parts.push({ type: "separator", text: "/" });
        break;
      case ":": {
        addStringPart();
        do {
          i += 1;
          text += path[i];
        } while (i + 1 < path.length && /\w/.exec(path[i + 1]));
        if (!text) {
          throw new Error("Empty param name");
        }
        parts.push({ type: "param", text });
        text = "";
        break;
      }
      case "*":
        addStringPart();
        parts.push({ type: "param", text: "*" });
        break;
      case "+":
      case "?":
        throw new Error(`${char} is not supported`);
      default:
        text += char;
    }
  }

  addStringPart();
  return parts;
}

export function exportEndpoint(
  options:
    | string
    | {
        name: string;
        body?: boolean;
        query?: boolean;
      }
) {
  const exportAPI = (req, res, next) => next();

  exportAPI[optionsSymbol] =
    typeof options === "string" ? { name: options } : options;

  return exportAPI;
}

type Layer = {
  handle: (() => any) & { stack: Layer[]; path: string };
  path?: string;
  keys?: { name: string }[];
  method?: string;
  regexp: RegExp;
  route: { stack?: Layer[]; path?: string };
};

type ExportedEndpoint = {
  name: string;
  method: string;
  path: string;
  params: string[];
  options: Options;
  body: boolean;
  query: boolean;
};

export function getExportedEndpoints(app: Express) {
  return getExportsInExpressStack(app._router.stack, []);
}

function getExportsInExpressStack(
  stack: Layer[],
  parentPaths: string[],
  isSupported = true
) {
  const result: ExportedEndpoint[] = [];

  for (const layer of stack) {
    const exposedOptions = layer.handle?.[optionsSymbol];

    const fullPath = [...parentPaths, layer.path].filter(Boolean);
    const path = fullPath.join("/").replace(/\/+/g, "/");

    if (exposedOptions && path) {
      if (!isSupported) {
        throw new Error(
          "This nested path contains params and it's not currently supported " +
            path
        );
      }

      const parts = parsePath(path);

      result.push(getExportedEndpoint(layer.method, exposedOptions, parts));
    } else if (layer.route?.stack) {
      result.push(
        ...getExportsInExpressStack(
          layer.route.stack,
          [...parentPaths, layer.route.path],
          isSupported
        )
      );
    } else if (layer.handle?.stack) {
      const randexp = new RandExp(layer.regexp.source);
      randexp.max = 0;
      result.push(
        ...getExportsInExpressStack(
          layer.handle.stack,
          [...parentPaths, randexp.gen()],
          isSupported && layer.keys.length === 0
        )
      );
    }
  }

  return result;
}

const methodsWithPayload = ["post", "put", "patch"];

function getExportedEndpoint(
  method: string,
  options: Options,
  parts: PathPart[]
) {
  const hasBody = Object.prototype.hasOwnProperty.call(options, "body")
    ? options.body
    : methodsWithPayload.includes(method);

  const result: ExportedEndpoint = {
    name: options.name,
    method,
    path: "",
    params: [],
    body: !!hasBody,
    query: !!options.query,
    options
  };

  let wildcardIndex = 1;
  for (const part of parts) {
    if (part.type === "param") {
      const paramName =
        part.text === "*"
          ? `param${wildcardIndex === 1 ? "" : wildcardIndex}`
          : part.text;

      result.params.push(paramName);
      result.path += `\${${paramName}}`;
    } else {
      result.path += part.text;
    }
  }

  return result;
}

export function exportApiToJsFile(app: Express, path: string) {
  const endpoints = getExportedEndpoints(app);
  let data = "";

  for (const endpoint of endpoints) {
    const args = [
      ...endpoint.params,
      endpoint.query ? "query" : "",
      endpoint.body ? "body" : ""
    ].filter(Boolean);

    data += `export async function ${endpoint.name}(${args.join(", ")}) {
  return fetch(\`${endpoint.path}\`, { method: '${
      endpoint.method
    }',  headers: { 'Content-Type': 'application/json' }, ${
      endpoint.body ? "body: JSON.stringify(body), " : ""
    }});
}\n\n`;
  }

  return fs.writeFile(path, data);
}

import { Endpoint, ExportedEndpoint, methodsWithPayload, middlewareName, Options } from "./const";
import { Express } from "express";

const regExpToParseExpressPathRegExp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/;
const regExpToReplaceExpressPathRegExpParams = /\(\?:\(\[\^\\\/]\+\?\)\)/;
const regexpExpressParamRegexp = /\(\?:\(\[\^\\\/]\+\?\)\)/g;

const EXPRESS_ROOT_PATH_REGEXP_VALUE = "/^\\/?(?=\\/|$)/i";
const STACK_ITEM_VALID_NAMES = ["router", "bound dispatch", "mounted_app"];

function hasParams(expressPathRegExp: string) {
  return regexpExpressParamRegexp.test(expressPathRegExp);
}

function parseExpressRoute(route: any, basePath: string) {
  const paths = [];

  if (Array.isArray(route.path)) {
    paths.push(...route.path);
  } else {
    paths.push(route.path);
  }

  return paths.flatMap(path => {
    const completePath = basePath && path === "/" ? basePath : `${basePath}${path}`;

    return route.stack
      .map((item: any) => {
        if (item.handle.name === middlewareName) {
          let res = null;
          item.handle(middlewareName, null, (options: Options<any, any>) => (res = options));
          if (res) {
            return { path: completePath, method: item.method, options: res };
          }
        }
      })
      .filter(Boolean);
  });
}

function parseExpressPath(expressPathRegExp: string, params: { name: string }[]) {
  let expressPathRegExpExec = regExpToParseExpressPathRegExp.exec(expressPathRegExp);
  let parsedRegExp = expressPathRegExp.toString();
  let paramIndex = 0;

  while (hasParams(parsedRegExp)) {
    const paramName = params[paramIndex].name;
    const paramId = `:${paramName}`;

    parsedRegExp = parsedRegExp.replace(regExpToReplaceExpressPathRegExpParams, paramId);

    paramIndex++;
  }

  if (parsedRegExp !== expressPathRegExp.toString()) {
    expressPathRegExpExec = regExpToParseExpressPathRegExp.exec(parsedRegExp);
  }

  return expressPathRegExpExec?.[1].replace(/\\\//g, "/");
}

function parseEndpoints(app: Express, basePath: string = "", endpoints: Endpoint[] = []) {
  const stack = app.stack || (app._router && app._router.stack);
  return stack ? parseStack(stack, basePath, endpoints) : [];
}

function parseStack(stack: any, basePath: string, endpoints: Endpoint[]) {
  stack.forEach((stackItem: any) => {
    if (stackItem.route) {
      endpoints.push(...parseExpressRoute(stackItem.route, basePath));
    } else if (STACK_ITEM_VALID_NAMES.includes(stackItem.name)) {
      const isExpressPathRegexp = regExpToParseExpressPathRegExp.test(stackItem.regexp);

      let newBasePath = basePath;

      if (isExpressPathRegexp) {
        const parsedPath = parseExpressPath(stackItem.regexp, stackItem.keys);

        newBasePath += `/${parsedPath}`;
      } else if (
        !stackItem.path &&
        stackItem.regexp &&
        stackItem.regexp.toString() !== EXPRESS_ROOT_PATH_REGEXP_VALUE
      ) {
        const regExpPath = ` RegExp(${stackItem.regexp}) `;

        newBasePath += `/${regExpPath}`;
      }

      endpoints = parseEndpoints(stackItem.handle, newBasePath, endpoints);
    }
  });

  return endpoints;
}

function parsePath(path: string) {
  const parts = [];
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

function getExportedEndpoint({ path, method, options }: Endpoint): ExportedEndpoint {
  const parts = parsePath(path);
  const body = Object.prototype.hasOwnProperty.call(options, "body")
    ? options.body
    : methodsWithPayload.includes(method);

  const result = {
    name: options.name,
    method,
    path: "",
    params: [] as string[],
    body: body,
    query: options.query,
    options
  };

  let wildcardIndex = 1;
  for (const part of parts) {
    if (part.type === "param") {
      const paramName = part.text === "*" ? `wildcard${wildcardIndex === 1 ? "" : wildcardIndex}` : part.text;
      if (part.text === "*") {
        wildcardIndex++;
      }

      result.params.push(paramName);
      result.path += `\${${paramName}}`;
    } else {
      result.path += part.text;
    }
  }

  return result;
}

export default function getFrapiEndpoints(app: Express) {
  return parseEndpoints(app).map(getExportedEndpoint);
}

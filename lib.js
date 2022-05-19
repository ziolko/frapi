const fs = require("fs/promises");

const regExpToParseExpressPathRegExp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/;
const regExpToReplaceExpressPathRegExpParams = /\(\?:\(\[\^\\\/]\+\?\)\)/;
const regexpExpressParamRegexp = /\(\?:\(\[\^\\\/]\+\?\)\)/g;

const EXPRESS_ROOT_PATH_REGEXP_VALUE = "/^\\/?(?=\\/|$)/i";
const STACK_ITEM_VALID_NAMES = ["router", "bound dispatch", "mounted_app"];

const middlewareName = "frapiMiddleware";

/**
 * Returns true if found regexp related with express params
 * @param {string} expressPathRegExp
 * @returns {boolean}
 */
const hasParams = function(expressPathRegExp) {
  return regexpExpressParamRegexp.test(expressPathRegExp);
};

/**
 * @param {Object} route Express route object to be parsed
 * @param {string} basePath The basePath the route is on
 * @return {Object[]} Endpoints info
 */
const parseExpressRoute = function(route, basePath) {
  const paths = [];

  if (Array.isArray(route.path)) {
    paths.push(...route.path);
  } else {
    paths.push(route.path);
  }

  return paths.flatMap(path => {
    const completePath =
      basePath && path === "/" ? basePath : `${basePath}${path}`;

    return route.stack
      .map(item => {
        if (item.handle.name === middlewareName) {
          let res = null;
          item.handle(middlewareName, null, options => (res = options));
          if (res) {
            return { path: completePath, method: item.method, options: res };
          }
        }
      })
      .filter(Boolean);
  });
};

/**
 * @param {RegExp} expressPathRegExp
 * @param {Object[]} params
 * @returns {string}
 */
const parseExpressPath = function(expressPathRegExp, params) {
  let expressPathRegExpExec = regExpToParseExpressPathRegExp.exec(
    expressPathRegExp
  );
  let parsedRegExp = expressPathRegExp.toString();
  let paramIndex = 0;

  while (hasParams(parsedRegExp)) {
    const paramName = params[paramIndex].name;
    const paramId = `:${paramName}`;

    parsedRegExp = parsedRegExp.replace(
      regExpToReplaceExpressPathRegExpParams,
      paramId
    );

    paramIndex++;
  }

  if (parsedRegExp !== expressPathRegExp.toString()) {
    expressPathRegExpExec = regExpToParseExpressPathRegExp.exec(parsedRegExp);
  }

  return expressPathRegExpExec[1].replace(/\\\//g, "/");
};

/**
 * @param {Object} app
 * @param {string} [basePath]
 * @param {Object[]} [endpoints]
 * @returns {Object[]}
 */
const parseEndpoints = function(app, basePath, endpoints) {
  const stack = app.stack || (app._router && app._router.stack);

  endpoints = endpoints || [];
  basePath = basePath || "";

  if (!stack) {
    endpoints.push({
      path: basePath,
      methods: [],
      middlewares: []
    });
  } else {
    endpoints = parseStack(stack, basePath, endpoints);
  }

  return endpoints;
};

/**
 * @param {Object} stack
 * @param {string} basePath
 * @param {Object[]} endpoints
 * @returns {Object[]}
 */
const parseStack = function(stack, basePath, endpoints) {
  stack.forEach(stackItem => {
    if (stackItem.route) {
      endpoints.push(...parseExpressRoute(stackItem.route, basePath));
    } else if (STACK_ITEM_VALID_NAMES.includes(stackItem.name)) {
      const isExpressPathRegexp = regExpToParseExpressPathRegExp.test(
        stackItem.regexp
      );

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
};

function parsePath(path) {
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

const methodsWithPayload = ["post", "put", "patch"];

function getExportedEndpoint({ path, method, options }) {
  const parts = parsePath(path);
  const hasBody = Object.prototype.hasOwnProperty.call(options, "body")
    ? options.body
    : methodsWithPayload.includes(method);

  const result = {
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
          ? `path${wildcardIndex === 1 ? "" : wildcardIndex}`
          : part.text;
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

module.exports = function(options) {
  // Name of this function has to be equal const middlewareName
  return function frapiMiddleware(req, res, next) {
    if (req === middlewareName) {
      next(typeof options === "string" ? { name: options } : options);
      return;
    }

    return next();
  };
};

exports.getEndpoints = function(app) {
  return parseEndpoints(app).map(getExportedEndpoint);
};

exports.saveToFile = async function(app, path, generator = "js", options = {}) {
  if (!path) {
    throw new Error("Missing frapi output file path");
  }

  const generatorFunction =
    typeof generator === "function" ? generator : generators[generator];

  if (!generatorFunction) {
    throw new Error("Invalid generator function");
  }

  const endpoints = exports.getEndpoints(app);
  const content = generatorFunction(endpoints, options);
  await fs.writeFile(path, content);
};

const generators = {
  js: jsGenerator,
  ts: tsGenerator
};

function jsGenerator(endpoints) {
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
  return data;
}

function tsGenerator(endpoints) {
  let data = "";

  for (const endpoint of endpoints) {
    const args = [
      ...endpoint.params.map(param => `${param}: string`),
      endpoint.query ? "query: Record<string, string>" : "",
      endpoint.body ? "body: any" : ""
    ].filter(Boolean);

    data += `export async function ${endpoint.name}(${args.join(", ")}) {
  return fetch(\`${endpoint.path}\`, { method: '${
      endpoint.method
    }',  headers: { 'Content-Type': 'application/json' }, ${
      endpoint.body ? "body: JSON.stringify(body), " : ""
    }});
}\n\n`;
  }
  return data;
}

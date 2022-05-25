import { type } from "os";

export function MapOf<T>(type: T): { $type: Record<string, PropertyType<T>>; $structure: "map" } {
  return { $structure: "map", $innerType: type } as any;
}

export function ArrayOf<T>(type: T): { $type: PropertyType<T>[]; $structure: "array" } {
  return { $structure: "array", $innerType: type } as any;
}

export function UnionOf<A, B>(a: A, b: B): { $type: A | B; $structure: "union" };
export function UnionOf<A, B, C>(a: A, b: B, c: C): { $type: A | B | C; $structure: "union" };
export function UnionOf<A, B, C, D>(a: A, b: B, c: C, d: D): { $type: A | B | C | D; $structure: "union" };
export function UnionOf<T>(...args: T[]): { $type: PropertyType<T>; $structure: "union" } {
  return { $structure: "union", $innerType: args } as any;
}

export type ObjectType<T extends {}> = {
  [P in keyof T as P extends `\$${infer P0}` ? never : P extends `${infer P1}?` ? P1 : P]: P extends `${infer P1}?`
    ? PropertyType<T[P]> | undefined
    : PropertyType<T[P]>;
};

// prettier-ignore
export type PropertyType<V>
    = V extends StringConstructor ? string
    : V extends NumberConstructor ? number
    : V extends BooleanConstructor ? boolean
    : V extends null ? null
    : V extends (...args: unknown[]) => unknown ? never
    : V extends (infer E)[] ? PropertyType<E>[]
    : V extends { $type: infer K, $structure?: "map" | "array" | "union", $innerType?: any } ? PropertyType<K>
    : V extends {} ? ObjectType<V> : never;

export class ValidationError extends Error {
  constructor(message: string, path: (string | number)[]) {
    let pathString = "";
    for (const pathItem of path) {
      if (typeof pathItem === "number") {
        pathString += `[${pathItem}]`;
      } else if (/^[a-zA-Z_$][_a-zA-Z0-9]*$/.test(pathItem)) {
        pathString += `${pathString.length > 0 ? "." : ""}${pathItem}`;
      } else {
        pathString += `["${pathItem.replace(/"/g, '\\"')}"]`;
      }
    }

    super(pathString.length > 0 ? `Field ${pathString}. ${message}` : message);
  }
}

const pathSymbol = Symbol("validation-path");
const quote = (str: string) => JSON.stringify(str);

export function validate<T>(type: T, object: any, options = { strict: true }): PropertyType<T> {
  // @ts-ignore
  const currentPath = options?.[pathSymbol] ?? [];
  const getNestedOptions = (node: string | number) => ({ ...(options ?? {}), [pathSymbol]: [...currentPath, node] });

  switch (type as any) {
    case String:
      if (typeof object === "string") return object as any;
      else throw new ValidationError(`Expected to be a string but got: ${quote(object)}`, currentPath);
    case Boolean:
      if (typeof object === "boolean") return object as any;
      else throw new ValidationError(`Expected to be a boolean but got: ${quote(object)}`, currentPath);
    case Number:
      if (typeof object === "number") return object as any;
      else throw new ValidationError(`Expected to be a number but got: ${quote(object)}`, currentPath);
    case null:
      if (object === null) return object as any;
      else throw new ValidationError(`Expected to be null but got: ${quote(object)}`, currentPath);
  }

  if (typeof type === "string") {
    if (object === type) return object as any;
    else throw new ValidationError(`Expected string ${quote(type)} but got: "${quote(object)}"`, currentPath);
  }

  if (typeof type !== "object") {
    throw new ValidationError(`Unexpected item of type "${typeof type}": ${quote(object)}`, currentPath);
  }

  const objType = type as any;

  if (objType.$structure === "array") {
    if (Array.isArray(object))
      return object.map((item, index) => validate(objType.$innerType, item, getNestedOptions(index))) as any;
    else throw new ValidationError(`Expected to be an array but got: ${quote(object)}`, currentPath);
  }

  if (objType.$structure === "map") {
    if (typeof object !== "object") {
      throw new ValidationError(`Expected to be an object but got: ${quote(object)}`, currentPath);
    }

    for (const key of Object.keys(object)) {
      validate(objType.$innerType, object[key], getNestedOptions(key));
    }
    return object as any;
  }

  if (objType.$structure === "union") {
    if (!Array.isArray(objType.$innerType)) {
      throw new ValidationError(`Expected $innerType to be an array: ${objType.$innerType}`, currentPath);
    }

    for (const optionType of objType.$innerType) {
      try {
        validate(optionType, object, options);
        return object as any;
      } catch {}
    }
    // TODO: better error message for union types
    throw new ValidationError(`Expected to be an one of union types but got: ${quote(object)}`, currentPath);
  }

  if (objType.$type) {
    validate(objType.$type, object, options);

    let customValidation: any = true;

    try {
      customValidation = objType.$validate?.(object);
    } catch (error) {
      throw new ValidationError(error.message, currentPath);
    }

    if (customValidation === false) {
      throw new ValidationError(`Custom validation failed for value: ${quote(object)}`, currentPath);
    }

    return object;
  }

  if (typeof object !== "object") {
    throw new ValidationError(`Expected to be an object: ${quote(object)}`, currentPath);
  }

  for (const key of Object.keys(type)) {
    const isOptional = key.endsWith("?");
    const propertyName = isOptional ? key.slice(0, -1) : key;

    if (isOptional && object[propertyName] === undefined) {
      continue;
    }

    // @ts-ignore
    validate(type[key], object[propertyName], getNestedOptions(key));
  }

  if (options?.strict) {
    for (const key of Object.keys(object)) {
      if (!objType[key] && !objType[`${key}?`]) {
        throw new ValidationError(`Unexpected object property: ${quote(key)}`, currentPath);
      }
    }
  }

  return object;
}

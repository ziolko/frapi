import { simplePropertyKeyRegex } from "./const";

export default function generateTypes(type: any): string {
  switch (type) {
    case String:
      return "string";
    case Boolean:
      return "boolean";
    case Number:
      return "number";
    case null:
      return "null";
  }

  if (typeof type === "string" || typeof type === "number") {
    return JSON.stringify(type);
  }

  if (typeof type !== "object") {
    throw new Error("Invalid type: " + JSON.stringify(type));
  }

  const objType: any = type;
  if (objType.$structure === "array") {
    return `${generateTypes(objType.$innerType)}[]`;
  }

  if (objType.$structure === "map") {
    return `Record<string, ${generateTypes(objType.$innerType)}>`;
  }

  if (objType.$structure === "union") {
    return objType.$innerType.map((innerType: any) => generateTypes(innerType)).join(" | ");
  }

  if (objType.$type) {
    return generateTypes(objType.$type);
  }

  const properties = Object.keys(objType)
    .filter(key => !key.startsWith("$"))
    .map(key => {
      const isOptional = key.endsWith("?");
      const propertyName = isOptional ? key.slice(0, -1) : key;
      const propertyString = simplePropertyKeyRegex.test(propertyName)
        ? propertyName
        : `"${propertyName.replace(/"/g, '\\"')}"`;
      return `${propertyString}${isOptional ? "?" : ""}: ${generateTypes(objType[key])}`;
    });

  return `{ ${properties.join("; ")} }`;
}

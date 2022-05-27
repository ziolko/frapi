import { ArrayOf, MapOf, UnionOf } from "../lib/types";
import generateTypes from "../lib/generate-types";

describe("Typescript generation", () => {
  it("Generates string type", () => expect(generateTypes(String)).toEqual("string"));
  it("Generates number type", () => expect(generateTypes(Number)).toEqual("number"));
  it("Generates boolean type", () => expect(generateTypes(Boolean)).toEqual("boolean"));
  it("Generates null type", () => expect(generateTypes(null)).toEqual("null"));
  it("Generates const string type", () => expect(generateTypes("test")).toEqual('"test"'));
  it("Generates const number", () => expect(generateTypes(34)).toEqual("34"));
  it("Generates array of string type", () => expect(generateTypes(ArrayOf(String))).toEqual("string[]"));
  it("Generates map of number type", () => expect(generateTypes(MapOf(Number))).toEqual("Record<string, number>"));

  it("Generates union type", () => {
    const type = UnionOf(Number, String, Boolean);
    expect(generateTypes(type)).toEqual("number | string | boolean");
  });

  it("Generates custom type", () => {
    const Guid = { $type: String };
    expect(generateTypes(Guid)).toEqual("string");
  });

  it("Generates simple object type", () => {
    const Type = { name: String, 'my-"age': Number };
    expect(generateTypes(Type)).toEqual(`{ name: string; "my-\\"age": number }`);
  });

  it("Generates object type with optional fields", () => {
    const Type = { "name?": String, "my-age?": Number };
    expect(generateTypes(Type)).toEqual(`{ name?: string; "my-age"?: number }`);
  });

  it("Generates nested object type", () => {
    const Type = {
      "name?": String,
      friends: ArrayOf({ id: Number }),
      address: {
        country: UnionOf("Poland", "US"),
        zipCode: String
      }
    };

    expect(generateTypes(Type)).toEqual(
      `{ name?: string; friends: { id: number }[]; address: { country: "Poland" | "US"; zipCode: string } }`
    );
  });
});

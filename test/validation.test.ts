import { ArrayOf, MapOf, AnyOf, validate, ValidationError, AllOf } from "../lib/types";

describe("validation", () => {
  it("Successfully validates a string", () => {
    validate(String, "test-string");
  });

  it("Fails when expects a string but gets a number", () => {
    expect(() => validate(String, 12)).toThrowError(ValidationError);
  });

  it("Successfully validates a number", () => {
    validate(Number, 100);
  });

  it("Fails when expects a number but gets a string", () => {
    expect(() => validate(Number, "test-string")).toThrowError(ValidationError);
  });

  it("Successfully validates a bool", () => {
    validate(Boolean, true);
  });

  it("Fails when expects a bool but gets a string", () => {
    expect(() => validate(Boolean, "test-string")).toThrowError(ValidationError);
  });

  it("Successfully validates a null", () => {
    validate(null, null);
  });

  it("Fails when expects a null but gets a string", () => {
    expect(() => validate(null, "test-string")).toThrowError(ValidationError);
  });

  it("Successfully validates an exact string", () => {
    validate("test", "test");
  });

  it("Successfully validates an exact number", () => {
    validate(41, 41);
  });

  it("Fails when expects an exact string but gets another string", () => {
    expect(() => validate("test", "another-string")).toThrowError(ValidationError);
  });

  it("Fails when expects an exact string but gets a number", () => {
    expect(() => validate("test", 12)).toThrowError(ValidationError);
  });

  it("Successfully validates an object", () => {
    validate({ id: Number }, { id: 100 });
  });

  it("Fails when an object field is of a different type", () => {
    expect(() => validate({ id: Number }, { id: "100" })).toThrowError(ValidationError);
  });

  it("Fails when expects an object but gets a number", () => {
    expect(() => validate({ id: Number }, 100)).toThrowError(ValidationError);
  });

  it("Fails when expects object has missing property", () => {
    expect(() => validate({ id: Number }, {})).toThrowError(ValidationError);
  });

  it("Fails when expects object has additional property with strict = true", () => {
    expect(() => validate({ id: Number }, { id: 100, name: "Test" })).toThrowError(ValidationError);
  });

  it("Succeeds when expects object has additional property with strict = False", () => {
    validate({ id: Number }, { id: 100, name: "Test" }, { strict: false });
  });

  it("Succeeds when expects a nested object with a single string property", () => {
    validate({ user: { name: String } }, { user: { name: "Test" } });
  });

  it("Fails when expects a nested object with a single string property but gets a number", () => {
    expect(() => validate({ user: { name: String } }, { user: { name: 100 } })).toThrowError(ValidationError);
  });

  it("Skips validation of fields starting with $ in the type definition ", () => {
    validate({ id: Number, $test: "Test" }, { id: 100 });
  });

  it("Doesn't allow fields starting with $ in object", () => {
    expect(() => validate({ id: Number, $test: "Test" }, { id: 100, $test: 12 })).toThrowError(ValidationError);
    expect(() => validate({ id: Number }, { id: 100, $test: 12 })).toThrowError(ValidationError);
  });

  it("Succeeds when validating an array of string", () => {
    validate(ArrayOf(String), ["Test1", "Test2", "Test3"]);
  });

  it("Fails when validating an array of string but one of them is a number", () => {
    expect(() => validate(ArrayOf(String), ["Test1", "Test2", "Test3", 100])).toThrowError(ValidationError);
  });

  it("Succeeds when validating an array of objects", () => {
    validate(ArrayOf({ name: String }), [{ name: "1" }, { name: "2" }]);
  });

  it("Fails when validating an array of objects with props of invalid type", () => {
    expect(() => validate(ArrayOf({ name: String }), [{ name: "1" }, { name: 2 }])).toThrowError(ValidationError);
  });

  it("Succeeds when validating an union type", () => {
    validate(AnyOf(String, Number), "test");
    validate(AnyOf(String, Number), 100);
  });

  it("Fails when validating an union type and gets another type", () => {
    expect(() => validate(AnyOf(String, Number), true)).toThrowError(ValidationError);
  });

  it("Succeeds when validating an intersection type", () => {
    validate(AllOf({ age: Number }, { surname: String }), { age: 18, surname: "Test" });
  });

  it("Fails when validating an intersection type and is missing a property", () => {
    expect(() => {
      validate(AllOf({ age: Number }, { name: String, surname: String }), { age: 18, surname: "Test" });
    }).toThrowError(ValidationError);
  });

  it("Fails when validating an intersection type and has additional propert", () => {
    expect(() => {
      validate(AllOf({ age: Number }, { surname: String }), { age: 18, name: "AA", surname: "Test" });
    }).toThrowError(ValidationError);
  });

  it("Succeeds when validating a map type", () => {
    validate(MapOf(String), { a: "test", b: "test2" });
  });

  it("Fails when validating a map type with item of a different type", () => {
    expect(() => validate(MapOf(String), { a: "test", b: 100 })).toThrowError(ValidationError);
  });

  it("Succeeds when validating an object map type", () => {
    validate(MapOf({ name: String }), { a: { name: "test" }, b: { name: "test2" } });
  });

  it("Fails when validating an object map type with item of a different type", () => {
    expect(() => validate(MapOf({ name: String }), { a: { name: "test" }, b: { name: 1 } })).toThrowError(
      ValidationError
    );
  });

  it("Succeeds when validating a map type of object or boolean", () => {
    validate(MapOf(AnyOf({ name: String }, Boolean)), { a: { name: "test" }, b: { name: "test2" }, c: false });
  });

  it("Succeeds validating optional field", () => {
    validate({ "id?": String }, { id: "test" });
  });

  it("Succeeds when optional field is absent", () => {
    validate({ "id?": String }, {});
  });

  it("Fails when optional field is of a different type", () => {
    expect(() => validate({ "id?": String }, { id: 12 })).toThrowError(ValidationError);
  });

  it("Calls custom validation method", () => {
    const $validate = jest.fn(arg => arg.length > 0);
    const NonEmptyString = { $type: String, $validate };

    validate(NonEmptyString, "Test");
    expect($validate).toBeCalledWith("Test");
  });

  it("Fails when custom type inner type doesn't match object", () => {
    const $validate = jest.fn(arg => arg.length > 0);
    const NonEmptyString = { $type: String, $validate };

    expect(() => validate(NonEmptyString, 10)).toThrowError(ValidationError);
    expect($validate).toBeCalledTimes(0);
  });

  it("Fails when custom validation method returns false", () => {
    const $validate = jest.fn(arg => arg.length > 0);
    const NonEmptyString = { $type: String, $validate };

    expect(() => validate(NonEmptyString, "")).toThrowError(ValidationError);
    expect($validate).toBeCalledWith("");
  });

  it("Shows a friendly path message in validation error for nested objects", () => {
    expect(() => validate({ id: String }, {})).toThrowError("Field id. Expected to be a string but got: undefined");
  });

  it("Shows a friendly path message for array indexes", () => {
    expect(() => validate({ items: ArrayOf(String) }, { items: ["One", "Two", 3] })).toThrowError(
      "Field items[2]. Expected to be a string but got: 3"
    );
  });

  it("Shows a friendly path message for fields with hyphen in the field key", () => {
    expect(() => validate({ items: MapOf(String) }, { items: { one: "one", two: "two", "item-3": 3 } })).toThrowError(
      'Field items["item-3"]. Expected to be a string but got: 3'
    );
  });

  it("Shows custom validation error message", () => {
    const Type = {
      sampleField: {
        $type: Number,
        $validate: () => {
          throw new Error("Test error");
        }
      }
    };
    expect(() => validate(Type, { sampleField: 120 })).toThrowError("Test error");
  });
});

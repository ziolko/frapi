import express, { Router } from "express";
import frapi from "../lib";
import { ArrayOf, validate } from "../lib/types";
import getFrapiEndpoints from "../lib/endpoints";

describe("Exporting", () => {
  it("Exposes a single GET endpoint at the root app instance", () => {
    const app = express();
    const options = "test_get_endpoint";
    app.get("/", frapi(options));

    const endpoints = getFrapiEndpoints(app);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].name).toEqual(options);
    expect(endpoints[0].method).toEqual("get");
  });

  it("Exposes a single POST endpoint at the root app instance", () => {
    const app = express();
    const options = "test_post_endpoint";
    app.post("/", frapi(options));

    const endpoints = getFrapiEndpoints(app);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].name).toEqual(options);
    expect(endpoints[0].method).toEqual("post");
  });

  it("Exposes a nested PUT endpoint", () => {
    const app = express();
    const router = Router();
    const options = "nested_put_endpoint";

    app.use("/foo", router);
    router.put("/bar", frapi(options));

    const endpoints = getFrapiEndpoints(app);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].name).toEqual(options);
    expect(endpoints[0].path).toEqual("/foo/bar");
    expect(endpoints[0].method).toEqual("put");
  });

  it("Exposes body type", () => {
    const BodyType = {
      "id?": Number,
      name: String,
      items: ArrayOf(String)
    };

    const app = express();
    app.get("/", frapi({ name: "test", body: BodyType }));

    const endpoints = getFrapiEndpoints(app);
    expect(endpoints).toHaveLength(1);
    validate(endpoints[0].body, { id: 20, name: "test", items: ["one", "two"] });
  });
});

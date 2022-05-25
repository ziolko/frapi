import express from "express";
import frapi, { getFrapiEndpoints } from "../lib";
import { ArrayOf, validate } from "../lib/types";

function getEndpoint(body?: any, query?: any) {
  const app = express();
  app.get("/", frapi("test", body, query));

  const endpoints = getFrapiEndpoints(app);
  expect(endpoints).toHaveLength(1);
  return endpoints[0];
}

it("Exports body type", () => {
  const BodyType = {
    "id?": Number,
    name: String,
    items: ArrayOf(String)
  };

  const endpoint = getEndpoint(BodyType);

  validate(endpoint.body, { id: 20, name: "test", items: ["one", "two"] });
});

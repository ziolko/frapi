import express from "express";
import frapi from "../lib";
import getFrapiEndpoints from "../lib/endpoints";

function getEndpoint(path: string) {
  const app = express();
  const options = "test_path_endpoint";
  app.get(path, frapi(options));

  const endpoints = getFrapiEndpoints(app);
  expect(endpoints).toHaveLength(1);
  return endpoints[0];
}

it("Exports a single path param", () => {
  const endpoint = getEndpoint("/:foo");
  expect(endpoint.params).toEqual(["foo"]);
});

it("Exports three nested path params", () => {
  const endpoint = getEndpoint("/:foo/test/:bar/:zoo");
  expect(endpoint.params).toEqual(["foo", "bar", "zoo"]);
});

it("Exports a path param and a wildcard param", () => {
  const endpoint = getEndpoint("/:foo/*");
  expect(endpoint.params).toEqual(["foo", "wildcard"]);
});

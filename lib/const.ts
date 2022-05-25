export const middlewareName = "frapiMiddleware";
export const methodsWithPayload = ["post", "put", "patch"];

export type Options<Body, Query> = {
  name: string;
  body: Body;
  query: Query;
};

export type Endpoint = {
  path: string;
  method: string;
  options: any;
};

export type ExportedEndpoint = {
  name: string;
  method: string;
  path: string;
  params: string[];
  body: boolean | object;
  query: boolean | object;
  options: Options<unknown, unknown>;
};

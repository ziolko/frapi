import { middlewareName } from "./const";
import express from "express";
import { ToType, validate } from "./types";
import * as core from "express-serve-static-core";

export default function frapiMiddleware<Body = undefined, Query = undefined, Response = undefined>(
  options: string | { name?: string; body?: Body; query?: Query; response?: Response }
) {
  const obj = {
    // Name of this function has to be equal const middlewareName
    frapiMiddleware<
      P = core.ParamsDictionary,
      ResBody = any,
      ReqQuery = any,
      Locals extends Record<string, any> = Record<string, any>
    >(req: express.Request<any, ResBody, ToType<Body>, ToType<Query>, Locals>, res: express.Response, next: any) {
      // @ts-ignore
      if (req === middlewareName) {
        if (typeof options === "string") next({ name: options });
        else next({ name: options.name, body: options.body, query: options.query, response: options.response });
        return;
      }

      if (typeof options === "object" && options.body && typeof options.body !== "boolean") {
        try {
          validate(options.body, req.body);
        } catch (error) {
          res.status(400);
          res.send("Error while validating request payload. " + error.message);
          return;
        }
      }

      if (typeof options === "object" && options.query && typeof options.query !== "boolean") {
        try {
          validate(options.query, req.body);
        } catch (error) {
          res.status(400);
          res.send("Error while validating request query. " + error.message);
          return;
        }
      }

      return next();
    }
  };

  return obj.frapiMiddleware;
}

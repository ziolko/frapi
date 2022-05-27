import { middlewareName, Options } from "./const";
import express from "express";
import { ToType } from "./types";
import * as core from "express-serve-static-core";

export default function frapiMiddleware<Body = undefined, Query = undefined>(
  name: string,
  bodyType?: Body,
  queryType?: Query
) {
  // Name of this function has to be equal const middlewareName
  return function frapiMiddleware<
    P = core.ParamsDictionary,
    ResBody = any,
    ReqQuery = any,
    Locals extends Record<string, any> = Record<string, any>
  >(req: express.Request<any, ResBody, ToType<Body>, ToType<Query>, Locals>, res: Express.Response, next: any) {
    // @ts-ignore
    if (req === middlewareName) {
      next({ name: name, body: bodyType, query: queryType });
      return;
    }

    return next();
  };
}

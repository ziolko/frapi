import {
  IRouterHandler,
  IRouterMatcher,
  NextFunction,
  ParamsDictionary,
  Request,
  RequestHandler,
  Response,
  RouteParameters,
} from "express-serve-static-core";

import { ParsedQs } from "qs";
import { RouterOptions } from "express";
import createRouter from "express-promise-router";

import { ToType } from "./types";
import { middleware } from "../lib";
import { addSendResponseSymbol } from "./const";

export interface FrapiRouter extends RequestHandler {
  all: ApiMethod;
  get: ApiMethod;
  post: ApiMethod;
  put: ApiMethod;
  delete: ApiMethod;
  patch: ApiMethod;
  options: ApiMethod;
  head: ApiMethod;

  checkout: ApiMethod;
  connect: ApiMethod;
  copy: ApiMethod;
  lock: ApiMethod;
  merge: ApiMethod;
  mkactivity: ApiMethod;
  mkcol: ApiMethod;
  move: ApiMethod;
  "m-search": ApiMethod;
  notify: ApiMethod;
  propfind: ApiMethod;
  proppatch: ApiMethod;
  purge: ApiMethod;
  report: ApiMethod;
  search: ApiMethod;
  subscribe: ApiMethod;
  trace: ApiMethod;
  unlock: ApiMethod;
  unsubscribe: ApiMethod;

  use: IRouterHandler<this> & IRouterMatcher<this>;
}

interface FrapiResponseVerified<ResBody = any, Locals extends Record<string, any> = Record<string, any>, StatusCode extends number = number> extends Response<ResBody, Locals, StatusCode> {
  /**
   * @deprecated You've provided response shape.
   * To ensure the response shape is verified
   */
  json: (body?: ResBody) => this;
  sendResponse: (payload: ResBody) => this;
}

interface FrapiResponseNonVerified<Locals extends Record<string, any> = Record<string, any>, StatusCode extends number = number> extends Response<any, Locals, StatusCode> {
  sendResponse: (payload: any) => this;
}

type FrapiResponse<ResBody = any, Locals extends Record<string, any> = Record<string, any>, StatusCode extends number = number> =
    ResBody extends { $$__any: boolean }
        ? FrapiResponseNonVerified<Locals, StatusCode>
        : FrapiResponseVerified<ResBody, Locals, StatusCode>;

export interface FrapiRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> {
  (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: FrapiResponse<ResBody, Locals>,
    next: NextFunction
  ): void;
}

export interface ApiMethod {
  <
    Path extends string,
    ReqBody = any,
    ReqQuery = any,
    ResBody = any,
    Locals extends Record<string, any> = Record<string, any>,
    P = RouteParameters<Path>
  >(
    options: Path, ...handlers: Array<FrapiRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>>): this;

  <
    Path extends string,
    ReqBody = never,
    ReqQuery = never,
    ResBody = any,
    Locals extends Record<string, any> = Record<string, any>,
    P = RouteParameters<Path>
  >(
    options: { path: Path; name?: string; body?: ReqBody; query?: ReqQuery; response?: ResBody },
    ...handlers: Array<
      FrapiRequestHandler<P, ResBody extends { $$__any: boolean } ? any : ToType<ResBody>, ToType<ReqBody>, ToType<ReqQuery>, Locals>
    >
  ): this;
}

export interface FrapiRouterConstructor {
  new (options?: RouterOptions): FrapiRouter;
  (options?: RouterOptions): FrapiRouter;
}

/**
 * @param options: {{ RouterOptions }}
 * @return {{ FrapiRouter }}
 */
function Router(options?: RouterOptions): FrapiRouter {
  const router = createRouter(options);

  const methods = [
    "all",
    "get",
    "post",
    "put",
    "delete",
    "patch",
    "options",
    "head",
    "checkout",
    "connect",
    "copy",
    "lock",
    "merge",
    "mkactivity",
    "mkcol",
    "move",
    "m-search",
    "notify",
    "propfind",
    "proppatch",
    "purge",
    "report",
    "search",
    "subscribe",
    "trace",
    "unlock",
    "unsubscribe"
  ];

  for (const name of methods) {
    const originalMethod = (router as any)[name];

    (router as any)[name] = (options: any, ...handlers: any[]) => {
      if (typeof options !== "object") {
        const addSendResponse = (req: Request, res: Response, next: NextFunction) => {
          (res as any).sendResponse = res.json;
          next();
        };

        return originalMethod.call(router, options, addSendResponse, ...handlers);
      }

      return originalMethod.call(
        router,
        options.path,
        middleware({ ...options, [addSendResponseSymbol]: true }),
        ...handlers
      );
    };
  }

  return router as any as FrapiRouter;
}

export default Router as FrapiRouterConstructor;

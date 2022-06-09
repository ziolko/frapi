import {
  IRouterHandler,
  IRouterMatcher,
  NextFunction,
  ParamsDictionary,
  Request,
  RequestHandler,
  Response,
  RouteParameters
} from "express-serve-static-core";

import { ParsedQs } from "qs";
import { RouterOptions } from "express";
import createRouter from "express-promise-router";

import { ToType } from "./types";
import { middleware } from "../lib";
import { addSendResponseSymbol } from "./const";

export interface FrapiRouter extends RequestHandler {
  all: ApiMethod<this>;
  get: ApiMethod<this>;
  post: ApiMethod<this>;
  put: ApiMethod<this>;
  delete: ApiMethod<this>;
  patch: ApiMethod<this>;
  options: ApiMethod<this>;
  head: ApiMethod<this>;

  checkout: ApiMethod<this>;
  connect: ApiMethod<this>;
  copy: ApiMethod<this>;
  lock: ApiMethod<this>;
  merge: ApiMethod<this>;
  mkactivity: ApiMethod<this>;
  mkcol: ApiMethod<this>;
  move: ApiMethod<this>;
  "m-search": ApiMethod<this>;
  notify: ApiMethod<this>;
  propfind: ApiMethod<this>;
  proppatch: ApiMethod<this>;
  purge: ApiMethod<this>;
  report: ApiMethod<this>;
  search: ApiMethod<this>;
  subscribe: ApiMethod<this>;
  trace: ApiMethod<this>;
  unlock: ApiMethod<this>;
  unsubscribe: ApiMethod<this>;

  use: IRouterHandler<this> & IRouterMatcher<this>;
}

export interface FrapiResponse<
  R = any,
  ResBody = any,
  ResBodyValidated = any,
  Locals extends Record<string, any> = Record<string, any>,
  StatusCode extends number = number
> extends Response<ResBody, Locals, StatusCode> {
  sendResponse: (payload: ResBodyValidated) => R;
}

export interface FrapiRequestHandler<
  R = any,
  P = ParamsDictionary,
  ResBody = any,
  ResBodyValidated = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> {
  (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: FrapiResponse<R, ResBody, ResBodyValidated, Locals>,
    next: NextFunction
  ): void;
}

export interface ApiMethod<R> {
  <
    Path extends string,
    ReqBody = any,
    ReqQuery = any,
    ResBody = any,
    Locals extends Record<string, any> = Record<string, any>,
    P = RouteParameters<Path>
  >(
    options: Path,
    ...handlers: Array<FrapiRequestHandler<R, P, ResBody, ResBody, ToType<ReqBody>, ToType<ReqQuery>, Locals>>
  ): R;

  <
    Path extends string,
    ReqBody = never,
    ReqQuery = never,
    ResBodyValidated = any,
    Locals extends Record<string, any> = Record<string, any>,
    P = RouteParameters<Path>
  >(
    options: { path: Path; name?: string; body?: ReqBody; query?: ReqQuery; response?: ResBodyValidated },
    ...handlers: Array<
      FrapiRequestHandler<R, P, never, ToType<ResBodyValidated>, ToType<ReqBody>, ToType<ReqQuery>, Locals>
    >
  ): R;
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

  return router as FrapiRouter;
}

export default Router as FrapiRouterConstructor;

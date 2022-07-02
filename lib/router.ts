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

interface FrapiResponseVerified<ResBody = any, Locals extends Record<string, any> = Record<string, any>, StatusCode extends number = number> extends Response<ResBody, Locals, StatusCode> {
  /** @deprecated You've provided response shape. To ensure the response shape is verified use sendResponse */
  json: (body?: ResBody) => this;
  /** @deprecated You've provided response shape. To ensure the response shape is verified use sendResponse */
  send: (body?: ResBody) => this;
  /** @deprecated You've provided response shape. To ensure the response shape is verified use sendResponse */
  jsonp: (body?: ResBody) => this;

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

export interface ApiMethod<R> {
  <
    Path extends string,
    ReqBody = any,
    ReqQuery = any,
    ResBody = any,
    Locals extends Record<string, any> = Record<string, any>,
    P = RouteParameters<Path>
  >(
    options: Path, ...handlers: Array<FrapiRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>>): R;

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
  ): R;
}

type Options = RouterOptions & {
  catchValidationErrors?: (e: any) => void
}

export interface FrapiRouterConstructor {
  new (options?: Options): FrapiRouter;
  (options?: Options): FrapiRouter;
}

/**
 * @param routerOptions: {{ RouterOptions }}
 * @return {{ FrapiRouter }}
 */
function Router(routerOptions?: Options): FrapiRouter {
  const router = createRouter(routerOptions);

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
        middleware({ catchValidationErrors: routerOptions?.catchValidationErrors , ...options, [addSendResponseSymbol]: true }),
        ...handlers
      );
    };
  }

  return router as FrapiRouter;
}

export default Router as FrapiRouterConstructor;

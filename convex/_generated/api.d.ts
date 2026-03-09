/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminMutations from "../adminMutations.js";
import type * as crons from "../crons.js";
import type * as dashboardMutations from "../dashboardMutations.js";
import type * as http from "../http.js";
import type * as queries from "../queries.js";
import type * as restaurants from "../restaurants.js";
import type * as sms from "../sms.js";
import type * as smsMutations from "../smsMutations.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminMutations: typeof adminMutations;
  crons: typeof crons;
  dashboardMutations: typeof dashboardMutations;
  http: typeof http;
  queries: typeof queries;
  restaurants: typeof restaurants;
  sms: typeof sms;
  smsMutations: typeof smsMutations;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

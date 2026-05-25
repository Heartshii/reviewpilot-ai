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
import type * as agency from "../agency.js";
import type * as billing from "../billing.js";
import type * as campaigns from "../campaigns.js";
import type * as competitorInternal from "../competitorInternal.js";
import type * as competitors from "../competitors.js";
import type * as crons from "../crons.js";
import type * as dashboardMutations from "../dashboardMutations.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as leaderboard from "../leaderboard.js";
import type * as loyalty from "../loyalty.js";
import type * as loyaltyActions from "../loyaltyActions.js";
import type * as mobile from "../mobile.js";
import type * as queries from "../queries.js";
import type * as restaurants from "../restaurants.js";
import type * as reviews from "../reviews.js";
import type * as security from "../security.js";
import type * as segmentUtils from "../segmentUtils.js";
import type * as sentiment from "../sentiment.js";
import type * as sms from "../sms.js";
import type * as smsMutations from "../smsMutations.js";
import type * as users from "../users.js";
import type * as voice from "../voice.js";
import type * as voiceActions from "../voiceActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminMutations: typeof adminMutations;
  agency: typeof agency;
  billing: typeof billing;
  campaigns: typeof campaigns;
  competitorInternal: typeof competitorInternal;
  competitors: typeof competitors;
  crons: typeof crons;
  dashboardMutations: typeof dashboardMutations;
  http: typeof http;
  integrations: typeof integrations;
  leaderboard: typeof leaderboard;
  loyalty: typeof loyalty;
  loyaltyActions: typeof loyaltyActions;
  mobile: typeof mobile;
  queries: typeof queries;
  restaurants: typeof restaurants;
  reviews: typeof reviews;
  security: typeof security;
  segmentUtils: typeof segmentUtils;
  sentiment: typeof sentiment;
  sms: typeof sms;
  smsMutations: typeof smsMutations;
  users: typeof users;
  voice: typeof voice;
  voiceActions: typeof voiceActions;
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

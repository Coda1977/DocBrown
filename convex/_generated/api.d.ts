/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as clusters from "../clusters.js";
import type * as coAdmins from "../coAdmins.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as lib_authSession from "../lib/authSession.js";
import type * as lib_resolveParticipant from "../lib/resolveParticipant.js";
import type * as lib_shortCode from "../lib/shortCode.js";
import type * as participants from "../participants.js";
import type * as postIts from "../postIts.js";
import type * as sessions from "../sessions.js";
import type * as votes from "../votes.js";
import type * as votingRounds from "../votingRounds.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  clusters: typeof clusters;
  coAdmins: typeof coAdmins;
  folders: typeof folders;
  http: typeof http;
  "lib/authSession": typeof lib_authSession;
  "lib/resolveParticipant": typeof lib_resolveParticipant;
  "lib/shortCode": typeof lib_shortCode;
  participants: typeof participants;
  postIts: typeof postIts;
  sessions: typeof sessions;
  votes: typeof votes;
  votingRounds: typeof votingRounds;
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

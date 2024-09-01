import { z } from "zod";

/** The maximum depth for generating key paths within nested arrays. */
export const DEFAULT_ARRAY_PATH_LENGTH = 5 as const;

/** A placeholder representing the index of array elements in key paths. */
export const DEFAULT_ARRAY_PATH_KEY = "<idx>" as const;

/** A set of default settings for generating key paths. */
export const DEFAULT_PATH_OPTIONS = Object.freeze({
    DEFAULT_ARRAY_PATH_KEY,
    DEFAULT_ARRAY_PATH_LENGTH,
} as const);

/** First positional operator for MongoDB. */
export const FIRST_POSITIONAL_OPERATOR = "$" as const;
/** All positional operator for MongoDB. */
export const ALL_POSITIONAL_OPERATOR = "$[]" as const;
/** Identifier positional operator for MongoDB. */
export const IDENTIFIER_POSITIONAL_OPERATOR = "$[<identifier>]" as const;

/** A map of positional operators for MongoDB. */
export const POSITIONAL_OPERATOR_MAP = Object.freeze({
    $: FIRST_POSITIONAL_OPERATOR,
    "$[]": ALL_POSITIONAL_OPERATOR,
    "$[<identifier>]": IDENTIFIER_POSITIONAL_OPERATOR,
} as const);

/** A wildcard index for MongoDB. */
export const WILDCARD_INDEX = "$**" as const;

/** A map of wildcard indexes for MongoDB. */
export const WILDCARD_INDEX_MAP = Object.freeze({
    "$**": WILDCARD_INDEX,
} as const);

/** Invalid Zod types that are not supported for key paths. */
export const INVALID_ZOD_TYPES = [z.ZodVoid, z.ZodPromise, z.ZodFunction];

/** Invalid `_id` Zod types */
export const INVALID_ID_ZOD_TYPES = [z.ZodArray, z.ZodTuple, z.ZodUndefined, z.ZodUnknown];

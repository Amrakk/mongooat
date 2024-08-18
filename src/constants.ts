import { z } from "zod";

// types
/** The maximum depth for generating key paths within nested arrays. */
export const DEFAULT_ARRAY_PATH_LENGTH = 5 as const;

/** A placeholder representing the index of array elements in key paths. */
export const DEFAULT_ARRAY_PATH_KEY = "<idx>" as const;

/** A set of default settings for generating key paths. */
export const DEFAULT_PATH_OPTIONS = Object.freeze({
    DEFAULT_ARRAY_PATH_KEY,
    DEFAULT_ARRAY_PATH_LENGTH,
} as const);

// schema
/** Invalid Zod types that are not supported for key paths. */
export const INVALID_ZOD_TYPES = [z.ZodVoid, z.ZodPromise, z.ZodFunction];

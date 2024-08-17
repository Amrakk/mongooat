import { z } from "zod";

// types
export const DEFAULT_ARRAY_PATH_LENGTH = 5 as const;
export const DEFAULT_ARRAY_PATH_KEY = "<idx>" as const;

export const DEFAULT_PATH_OPTIONS = Object.freeze({
    DEFAULT_ARRAY_PATH_KEY,
    DEFAULT_ARRAY_PATH_LENGTH,
} as const);

// schema
export const INVALID_ZOD_TYPES = [z.ZodVoid, z.ZodPromise, z.ZodFunction];

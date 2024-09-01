import type { z } from "zod";
import type { CreateIndexesOptions, IndexDescription, IndexDirection } from "mongodb";
import type { DEFAULT_PATH_OPTIONS, POSITIONAL_OPERATOR_MAP, WILDCARD_INDEX_MAP } from "./constants.js";

/************************/
/************************/
/***     GENERAL      ***/
/************************/
/************************/
export type OmitId<T> = Omit<T, "_id">;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Represents a valid model type, requiring a valid `_id` field.
 * If the `_id` field is not defined or is invalid, this type resolves to `never`.
 */
export type ValidModelType<MT> = MT extends { _id?: any } ? (IdField<MT> extends never ? never : MT) : MT;

/** Extract valid `_id` fields from model type */
export type IdField<MT> = MT extends { _id?: any }
    ? RemoveUndefined<MT["_id"]> extends NotArrayAndTuple
        ? RemoveUndefined<MT["_id"]>
        : never
    : never;

/**
 * Ensures that the type is not an `array`, `tuple`, or an `unknown` type.
 *
 * **Note:** This implementation relies on the `map` property to exclude `arrays` and `tuples`
 * which may cause issues if the type has a `map` property.
 */
type NotArrayAndTuple = ((object | string | bigint | number | boolean) & { map?: never }) | undefined | null;

type RemoveUndefined<T> = T extends undefined ? never : T;

/**
 * Returns all possible key paths of an object type, including nested objects and arrays.
 *
 * For arrays, the key path will include the array index.
 * If you use "<idx>" as the index key, it will refer to every element in the array.
 * The placeholder "<idx>" can be customized via the `DEFAULT_ARRAY_PATH_KEY` constant.
 *
 * **Note:**
 * Unsupported nested types:
 *  - Maps, Sets, Records
 *
 * @example
 * type User = {
 *   name: string;
 *   age: number;
 *   address: {
 *     city: string;
 *     country: string;
 *   };
 *   roles: string[];
 * };
 *
 * type Paths = ObjectKeyPaths<User>;
 * // "name" | "age" | "address" | "address.city" | "address.country" | "roles" | "roles.<idx>"
 *
 * @todo Add support for maps, sets, and records.
 */
export type ObjectKeyPaths<O extends Record<keyof any, unknown>> = ExtractKeyPaths<O, never>;

/** Extracts all possible key paths of an object. */
type ExtractKeyPaths<O extends Record<keyof any, unknown>, ArrKeyPath extends string> = {
    [K in Extract<keyof O, string>]:
        | K
        | ArrKeyPath
        | (NonNullable<O[K]> extends Array<any>
              ? ExtractArrayPaths<NonNullable<O[K]>, K, ArrKeyPath>
              : NonNullable<O[K]> extends Record<keyof any, unknown>
              ? `${K}.${ExtractKeyPaths<NonNullable<O[K]>, ArrKeyPath>}`
              : never);
}[Extract<keyof O, string>];

/** Extracts all possible key paths of an array. */
type ExtractArrayPaths<
    A extends Array<any>,
    Base extends string,
    ArrKeyPath extends string,
    Depth extends Prev[number] = DefaultArrayPathLength
> = {
    [K in keyof A]:
        | `${Base}.${IsArray<A> extends true ? ArrayItem<ArrKeyPath> : K}`
        | (Depth extends 0
              ? never
              : NonNullable<A[K]> extends Array<any>
              ? ExtractArrayPaths<
                    A[K],
                    `${Base}.${IsArray<A> extends true ? ArrayItem<ArrKeyPath> : K}`,
                    ArrKeyPath,
                    Prev[Depth]
                >
              : NonNullable<A[K]> extends Record<keyof any, unknown>
              ? `${Base}.${IsArray<A> extends true ? ArrayItem<ArrKeyPath> : K}.${ExtractKeyPaths<
                    NonNullable<A[K]>,
                    ArrKeyPath
                >}`
              : never);
}[number];

/** Tracks the depth of the array path. */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Placeholder for array index. */
type ArrayItem<ArrayPathKey> = ([ArrayPathKey] extends [never] ? DefaultArrayPathKey : ArrayPathKey) | number;
type IsArray<T> = T extends Array<any> ? (T extends any[] ? (T extends [any, ...any[]] ? false : true) : false) : false;

/************************/
/************************/
/***       ZOD        ***/
/************************/
/************************/
/**
 * Ensures that the `_id` field is not an `array`, `tuple`, `undefined` or `unknown` type.
 *
 * **Note:** This will return `ZodObject<never>` if the `_id` field is invalid.
 */
export type ValidSchemaType<T extends z.ZodRawShape> = z.ZodObject<
    T extends { _id: z.ZodType<any> } ? (UnwrapZodType<T["_id"]> extends ValidIdZodType ? T : never) : T
>;

/**
 * Restricts the schema to exclude `ZodArray`, `ZodTuple`, `ZodUndefined` and `ZodUnknown` types.
 *
 * **Note:** This implementation relies on the `unique properties` to exclude `arrays`, `tuples`, `undefined` and `unknown`.
 */
type ValidIdZodType = z.ZodType<any> & {
    rest?: never; // ZodTuple
    params?: never; // ZodUndefined
    element?: never; // ZodArray
    _unknown?: never; // ZodUnknown
};

/** Unwraps Zod types recursively. */
export type UnwrapZodType<T extends z.ZodType> = T extends { unwrap: () => infer U }
    ? U extends z.ZodType<any>
        ? UnwrapZodType<U>
        : U
    : T;

/************************/
/************************/
/***     INDEXES      ***/
/************************/
/************************/
/**
 * Extended `CreateIndexesOptions` that supports model key paths for `wildcardProjection`.
 *
 * Allows inclusion or exclusion of specific fields using 0 or 1, with optional `_id` inclusion.
 */
export type MGCreateIndexesOptions<T extends Record<keyof any, unknown>> = Omit<
    CreateIndexesOptions,
    "wildcardProjection"
> & {
    wildcardProjection?: { [K in RemoveWildcardPaths<KeyPathsWithWildcard<T>>]?: 0 | 1 } & { _id?: 1 };
};

/** Extended `IndexDescription` that support model key paths for `key` and `wildcardProjection`. */
export type MGIndexDescription<T extends Record<keyof any, unknown>> = Omit<
    IndexDescription,
    "key" | "wildcardProjection"
> & {
    key: MGIndexSpecification<T>;
    wildcardProjection?: { [K in RemoveWildcardPaths<KeyPathsWithWildcard<T>>]?: 0 | 1 } & { _id?: 1 };
};

/** Defines the index direction for each specified key path within the model. */
export type MGIndexSpecification<T extends Record<keyof any, unknown>> = {
    [K in KeyPathsWithWildcard<T>]?: IndexDirection;
};

type KeyPathsWithWildcard<O extends Record<keyof any, unknown>> = RemoveInvalidWildcardPaths<
    ExtractKeyPaths<O, WildcardIndexMap>
>;

type RemoveWildcardPaths<T extends string> = T extends `${infer _}${WildcardIndexMap}${infer __}` ? never : T;

type RemoveInvalidWildcardPaths<T extends string> =
    T extends `${infer _}${WildcardIndexMap}${infer __}${WildcardIndexMap}${infer ___}`
        ? never
        : T extends `${infer A}.${WildcardIndexMap}.${infer B}`
        ? `${A}.${B}`
        : T;

/************************/
/************************/
/***    CONSTANTS     ***/
/************************/
/************************/
type DefaultArrayPathKey = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_KEY;
type DefaultArrayPathLength = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_LENGTH;

type WildcardIndexMap = (typeof WILDCARD_INDEX_MAP)[keyof typeof WILDCARD_INDEX_MAP];
type PositionalOperatorMap = (typeof POSITIONAL_OPERATOR_MAP)[keyof typeof POSITIONAL_OPERATOR_MAP];

/************************/
/************************/
/***      ERROR       ***/
/************************/
/************************/
export type InvalidSchemaMap = { path: string; reason: string }[];

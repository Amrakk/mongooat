import { z } from "zod";
import { DEFAULT_PATH_OPTIONS } from "./constants.js";

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
export type ObjectKeyPaths<O extends Record<keyof any, unknown>> = {
    [K in Extract<keyof O, string>]:
        | K
        | (NonNullable<O[K]> extends Array<any>
              ? ExtractArray<NonNullable<O[K]>, K>
              : NonNullable<O[K]> extends Record<keyof any, unknown>
              ? `${K}.${ObjectKeyPaths<NonNullable<O[K]>>}`
              : never);
}[Extract<keyof O, string>];

/** Extracts all possible key paths of an array type. */
type ExtractArray<A extends Array<any>, Base extends string, Depth extends Prev[number] = DefaultArrayPathLength> = {
    [K in keyof A]:
        | `${Base}.${IsArray<A> extends true ? ArrayItem : K}`
        | (Depth extends 0
              ? never
              : NonNullable<A[K]> extends Array<any>
              ? ExtractArray<A[K], `${Base}.${IsArray<A> extends true ? ArrayItem : K}`, Prev[Depth]>
              : NonNullable<A[K]> extends Record<keyof any, unknown>
              ? `${Base}.${IsArray<A> extends true ? ArrayItem : K}.${ObjectKeyPaths<A[K]>}`
              : never);
}[number];

/** Tracks the depth of the array path. */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Placeholder for array index. */
type ArrayItem<ArrayPathKey extends string = DefaultArrayPathKey> = ArrayPathKey | number;
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
/***     DEFAULT      ***/
/************************/
/************************/
type DefaultArrayPathKey = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_KEY;
type DefaultArrayPathLength = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_LENGTH;

/************************/
/************************/
/***      ERROR       ***/
/************************/
/************************/
export type InvalidSchemaMap = { path: string; reason: string }[];

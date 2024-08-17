import { Model } from "./model.js";
import { ZodObject, ZodRawShape } from "zod";
import { DEFAULT_PATH_OPTIONS, INVALID_ZOD_TYPES } from "./constants.js";

export type TypeOf<T extends Model<any, any>> = T["_type"];
export type GetPaths<T extends Model<any, any>> = T["_paths"];

export type OmitId<T> = Omit<T, "_id">;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UpdateType<T> = DeepPartial<OmitId<T>>;

// TODO: handle zod types:
//      Done: nested arrays, tuples, objects, enums, custom types(not fully tested)
//
//      working on:
//      unions, discriminated union, record, map, sets, intersections

/**
 * Get all the key paths of an object type. This type will return a union of all possible key paths
 * of an object type, including nested objects and arrays.
 *
 * For arrays, the key path will include the array index as the key. By default, the array index key
 * is "<idx>", but this can be customized using the `DEFAULT_ARRAY_PATH_KEY` constant.
 *
 * NOTE:
 * This type does not yet support the following:
 *   - Unions
 *   - Discriminated unions
 *   - Intersections
 *   - Maps
 *   - Sets
 *   - Records
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
 */
export type ObjectKeyPaths<O extends Record<keyof any, unknown>> = {
    [K in Extract<keyof O, string>]:
        | K
        | (O[K] extends Array<any>
              ? ExtractArray<O[K], K>
              : O[K] extends Record<keyof any, unknown>
              ? `${K}.${ObjectKeyPaths<O[K]>}`
              : never);
}[Extract<keyof O, string>];

type ExtractArray<A extends Array<any>, Base extends string, Depth extends Prev[number] = DefaultArrayPathLength> = {
    [K in keyof A]:
        | `${Base}.${IsArray<A> extends true ? ArrayItem : K}`
        | (Depth extends 0
              ? never
              : A[K] extends Array<any>
              ? ExtractArray<A[K], `${Base}.${IsArray<A> extends true ? ArrayItem : K}`, Prev[Depth]>
              : A[K] extends Record<keyof any, unknown>
              ? `${Base}.${IsArray<A> extends true ? ArrayItem : K}.${ObjectKeyPaths<A[K]>}`
              : never);
}[number];

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type ArrayItem<ArrayPathKey extends string = DefaultArrayPathKey> = ArrayPathKey | number;
type DefaultArrayPathKey = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_KEY;
type DefaultArrayPathLength = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_LENGTH;

type IsArray<T> = T extends Array<any> ? (T extends any[] ? (T extends [any, ...any[]] ? false : true) : false) : false;

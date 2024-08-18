import { Model } from "./model.js";
import { DEFAULT_PATH_OPTIONS } from "./constants.js";

/** Extracts the type of a model instance. */
export type TypeOf<T extends Model<any, any>> = T["_type"];

/** Extracts the type dot-notation paths of a model instance. */
export type GetPaths<T extends Model<any, any>> = T["_paths"];

export type OmitId<T> = Omit<T, "_id">;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Update type for a model instance. */
export type UpdateType<T> = DeepPartial<OmitId<T>>;

/**
 * Returns all possible key paths of an object type, including nested objects and arrays.
 *
 * For arrays, the key path will include the array index.
 * If you use "<idx>" as the index key, it will refer to every element in the array.
 * The placeholder "<idx>" can be customized via the `DEFAULT_ARRAY_PATH_KEY` constant.
 *
 * NOTE:
 * Unsupported types:
 *  - Unions, Discriminated Unions
 *  - Intersections
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
 * @internal
 * @todo Add support for unions, discriminated unions, intersections, maps, sets, and records.
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

/** Extracts all possible key paths of an array type. */
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

/** Tracks the depth of the array path. */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type DefaultArrayPathKey = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_KEY;
type DefaultArrayPathLength = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_LENGTH;

/** Placeholder for array index. */
type ArrayItem<ArrayPathKey extends string = DefaultArrayPathKey> = ArrayPathKey | number;
type IsArray<T> = T extends Array<any> ? (T extends any[] ? (T extends [any, ...any[]] ? false : true) : false) : false;

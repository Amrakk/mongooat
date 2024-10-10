import type { z } from "zod";
import type MongooatError from "./errors/mongooatError.js";
import type { BulkWriteResult, CreateIndexesOptions, IndexDescription, IndexDirection, ObjectId } from "mongodb";
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

type HaveNull<T> = null extends T ? true : false;
type HaveUndefined<T> = undefined extends T ? true : false;
type HaveNullAndUndefined<T> =
    | (HaveNull<T> extends true ? null : never)
    | (HaveUndefined<T> extends true ? undefined : never);
type IsArray<T> = T extends Array<any> ? (T extends any[] ? (T extends [any, ...any[]] ? false : true) : false) : false;

export type Flatten<Type> =
    | (NonNullable<Type> extends Array<infer Item> ? Flatten<Item> : Type)
    | HaveNullAndUndefined<Type>;

export type AssignStringToObjectId<T> = T extends ObjectId
    ? ObjectId | string
    : T extends Array<infer U>
    ? AssignStringToObjectId<U>[]
    : T extends Record<string | number, unknown>
    ? { [K in keyof T]: AssignStringToObjectId<T[K]> }
    : T;

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
 * The placeholder "<idx>" can be customized via the `DEFAULT_ARRAY_PLACEHOLDER` constant.
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
 */
export type ObjectKeyPaths<O extends Record<string | number, unknown>> = ExtractKeyPaths<O, never>;

/** Extracts all possible key paths of an object. */
type ExtractKeyPaths<O extends Record<string | number, unknown>, ArrKeyPath extends string> = {
    [K in Extract<keyof O, string>]:
        | K
        | ArrKeyPath
        | (NonNullable<O[K]> extends Array<any>
              ? ExtractArrayPaths<NonNullable<O[K]>, K, ArrKeyPath>
              : NonNullable<O[K]> extends Record<string | number, unknown>
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
        | `${Base}.${IsArray<A> extends true ? ArrayPlaceHolder<ArrKeyPath> : K}`
        | (Depth extends 0
              ? never
              : NonNullable<A[K]> extends Array<any>
              ? ExtractArrayPaths<
                    A[K],
                    `${Base}.${IsArray<A> extends true ? ArrayPlaceHolder<ArrKeyPath> : K}`,
                    ArrKeyPath,
                    Prev[Depth]
                >
              : NonNullable<A[K]> extends Record<string | number, unknown>
              ? `${Base}.${IsArray<A> extends true ? ArrayPlaceHolder<ArrKeyPath> : K}.${ExtractKeyPaths<
                    NonNullable<A[K]>,
                    ArrKeyPath
                >}`
              : never);
}[number];

/** Tracks the depth of the array path. */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Removes the array key path from the specified key path. */
export type RemoveArrayKeyPaths<
    T extends string,
    ArrKeyPath extends string = DefaultArrayPlaceholder
> = T extends `${infer _}${ArrayPlaceHolder<ArrKeyPath>}${infer __}` ? never : T;

/** Placeholder for array index. */
type ArrayPlaceHolder<ArrKeyPath> = ([ArrKeyPath] extends [never] ? DefaultArrayPlaceholder : ArrKeyPath) | number;

/**
 * Resolves the type of a specific key path within the object.
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
 * type Name = ResolvePath<User, "name">; // { name: string; }
 * type City = ResolvePath<User, "address.city">; // { address: { city: string; } }
 * type Roles = ResolvePath<User, "roles.<idx>">; // { roles: string[]; }
 * type Role = ResolvePath<User, "roles.0">; // { roles: { 0: string; } }
 */
export type ResolvePath<
    O extends Record<string | number, unknown>,
    Path extends string
> = Path extends `${infer Key}.${infer Rest}` ? (Key extends keyof O ? ResolveRest<O, Key, Rest> : unknown) : O[Path];

/** Resolves the type of the specified key path within the object. */
type ResolveRest<
    O extends Record<string | number, unknown>,
    Key extends string | number,
    Rest extends string
> = NonNullable<O[Key]> extends Record<string | number, unknown>
    ? ResolveObject<O, Key, Rest>
    : NonNullable<O[Key]> extends Array<unknown>
    ? IsArray<NonNullable<O[Key]>> extends true
        ? ResolveArrayElement<NonNullable<O[Key]>, Rest> | HaveNullAndUndefined<O[Key]>
        : ResolveTupleElement<NonNullable<O[Key]>, Rest> | HaveNullAndUndefined<O[Key]>
    : ResolvePrimitive<O, Key>;

type ResolveObject<O, Key extends keyof O, Rest extends string> = NonNullable<O[Key]> extends Record<
    string | number,
    unknown
>
    ? ResolvePath<NonNullable<O[Key]>, Rest> | HaveNullAndUndefined<O[Key]>
    : unknown;

/** Resolves the array element type of the specified key within the object. */
type ResolveArrayElement<
    Arr extends Array<any>,
    Rest extends string
> = Rest extends `${infer Placeholder}.${infer RemainingPath}`
    ? RemainingPath extends ""
        ? unknown
        : Placeholder extends `${DefaultArrayPlaceholder}`
        ? NonNullable<Arr[0]> extends Record<string | number, unknown>
            ? (ResolvePath<NonNullable<Arr[0]>, RemainingPath> | HaveNullAndUndefined<Arr[0]>)[]
            : unknown
        : Placeholder extends `${number}`
        ? NonNullable<Arr[Placeholder & keyof Arr]> extends Record<string | number, unknown>
            ?
                  | ResolvePath<NonNullable<Arr[Placeholder & keyof Arr]>, RemainingPath>
                  | HaveNullAndUndefined<Arr[Placeholder & keyof Arr]>
            : unknown
        : unknown
    : Rest extends `${DefaultArrayPlaceholder}`
    ? Arr
    : Rest extends `${number}`
    ? NonNullable<Arr[Rest & keyof Arr]> | HaveNullAndUndefined<Arr[Rest & keyof Arr]>
    : unknown;

/** Resolves the tuple element type of the specified key within the object. */
type ResolveTupleElement<
    Tup extends Array<unknown>,
    Rest extends string
> = Rest extends `${infer Placeholder}.${infer RemainingPath}`
    ? RemainingPath extends ""
        ? unknown
        : Placeholder extends keyof Tup
        ? NonNullable<Tup[Placeholder]> extends Record<string | number, unknown>
            ? ResolvePath<NonNullable<Tup[Placeholder]>, RemainingPath> | HaveNullAndUndefined<Tup[Placeholder]>
            : unknown
        : unknown
    : Rest extends keyof Tup
    ? NonNullable<Tup[Rest]> | HaveNullAndUndefined<Tup[Rest]>
    : unknown;

/** Resolves the primitive type of the specified key within the object. */
type ResolvePrimitive<O, Key extends keyof O> = O[Key];

/************************/
/************************/
/***       ZOD        ***/
/************************/
/************************/
/** Assigns optional for keys wrapped with ZodDefault */
type InferShape<T extends z.ZodTypeAny> = T extends z.ZodObject<infer S extends z.ZodRawShape>
    ? OptionalDefaults<S>
    : T extends z.ZodArray<infer E>
    ? Array<E extends z.ZodObject<infer S extends z.ZodRawShape> ? OptionalDefaults<S> : z.infer<E>>
    : z.infer<T>;

/** Assigns optional for keys wrapped with ZodDefault */
export type OptionalDefaults<T extends z.ZodRawShape> = {
    [K in keyof T as ShouldAssignOptional<T, K>]?: InferShape<T[K]>;
} & {
    [K in keyof T as ShouldAssignOptional<T, K> extends never ? K : never]: InferShape<T[K]>;
};

type ShouldAssignOptional<T extends z.ZodRawShape, K extends keyof T> = UnwrapZodType<T[K]> extends z.ZodDefault<any>
    ? T extends z.ZodOptional<any>
        ? never
        : K
    : never;

/**
 * Ensures that the `_id` field is not an `array`, `tuple`, `undefined` or `unknown` type.
 *
 * **Note:** This will return `ZodObject<never>` if the `_id` field is invalid.
 */
export type ValidSchemaType<T extends z.ZodRawShape> = z.ZodObject<
    T extends { _id: z.ZodType<any> }
        ? T["_id"] extends z.ZodOptional<any>
            ? never
            : UnwrapZodType<T["_id"]> extends ValidIdZodType
            ? T
            : never
        : T
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
export type UnwrapZodType<T extends z.ZodType> = T extends { unwrap: () => infer U extends z.ZodType<any> }
    ? UnwrapZodType<U>
    : T extends { sourceType: () => infer U extends z.ZodType<any> }
    ? UnwrapZodType<U>
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
export type MGCreateIndexesOptions<T extends Record<string | number, unknown>> = Omit<
    CreateIndexesOptions,
    "wildcardProjection"
> & {
    wildcardProjection?: { [K in RemoveArrayKeyPaths<KeyPathsWithWildcard<T>, WildcardIndexPlaceHolders>]?: 0 | 1 } & {
        _id?: 1;
    };
};

/** Extended `IndexDescription` that support model key paths for `key` and `wildcardProjection`. */
export type MGIndexDescription<T extends Record<string | number, unknown>> = Omit<
    IndexDescription,
    "key" | "wildcardProjection"
> & {
    key: MGIndexSpecification<T>;
    wildcardProjection?: { [K in RemoveArrayKeyPaths<KeyPathsWithWildcard<T>, WildcardIndexPlaceHolders>]?: 0 | 1 } & {
        _id?: 1;
    };
};

/** Defines the index direction for each specified key path within the model. */
export type MGIndexSpecification<T extends Record<string | number, unknown>> = {
    [K in KeyPathsWithWildcard<T>]?: IndexDirection;
};

type KeyPathsWithWildcard<O extends Record<string | number, unknown>> = RemoveInvalidWildcardPaths<
    ExtractKeyPaths<O, WildcardIndexPlaceHolders>
>;

type RemoveInvalidWildcardPaths<T extends string> =
    T extends `${infer _}${WildcardIndexPlaceHolders}${infer __}${WildcardIndexPlaceHolders}${infer ___}`
        ? never
        : T extends `${infer A}.${WildcardIndexPlaceHolders}.${infer B}`
        ? `${A}.${B}`
        : T;

/************************/
/************************/
/***    CONSTANTS     ***/
/************************/
/************************/
type DefaultArrayPathLength = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PATH_LENGTH;
type DefaultArrayPlaceholder = typeof DEFAULT_PATH_OPTIONS.DEFAULT_ARRAY_PLACEHOLDER;

type WildcardIndexPlaceHolders = (typeof WILDCARD_INDEX_MAP)[keyof typeof WILDCARD_INDEX_MAP];
type PositionalOperatorPlaceholder = (typeof POSITIONAL_OPERATOR_MAP)[keyof typeof POSITIONAL_OPERATOR_MAP];

/************************/
/************************/
/***      ERROR       ***/
/************************/
/************************/
export type InvalidSchemaMap = { path: string; reason: string }[];
export type BulkWriteErrorMap = {
    index: number;
    error: MongooatError;
}[];
export type BulkWriteResultMap = {
    result: BulkWriteResult;
    validateErrors: BulkWriteErrorMap;
};

import { ObjectKeyPaths } from "../types.js";

export declare type ParseOptions<T extends Record<string | number, unknown>> =
    /** Set to true to validate only the specified fields in the input object */
    | { isPartial: true }

    /** Specify which fields to exclude from validation */
    | { partialFields: ObjectKeyPaths<T>[] };

import { ObjectKeyPaths } from "../types.js";

/** Represents the options for configuring a model. */
export declare type ModelOptions<MT extends Record<string, unknown> = {}> = {
    /** The name of the MongoDB collection associated with the model. */
    collectionName?: string;

    /** Specifies if validation should occur after retrieving data from the database (default: false). */
    checkOnGet?: boolean;

    /** An array of field names that should be hidden from the output. */
    hiddenFields?: ObjectKeyPaths<MT>[];
};

export const DefaultModelOptions: Required<ModelOptions> = {
    collectionName: "",
    checkOnGet: false,
    hiddenFields: [],
};

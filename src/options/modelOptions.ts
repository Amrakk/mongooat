import { ZodRawShape } from "zod";

/** Represents the options for configuring a model. */
export declare type ModelOptions<ST extends ZodRawShape> = {
    /** The name of the MongoDB collection associated with the model. */
    collection: string;

    /** Specifies if validation should occur after retrieving data from the database (default: false). */
    checkOnGet: boolean;

    /** An array of field names that should be hidden from the output. */
    hiddenFields: (keyof ST)[];
};

export const DefaultModelOptions: ModelOptions<ZodRawShape> = {
    collection: "",
    checkOnGet: false,
    hiddenFields: [],
};

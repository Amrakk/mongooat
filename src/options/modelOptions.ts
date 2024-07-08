import { ZodRawShape } from "zod";

export declare type ModelOptions<ST extends ZodRawShape> = {
    collection: string;
    hiddenFields: (keyof ST)[];
};

export const DefaultModelOptions: ModelOptions<ZodRawShape> = {
    collection: "",
    hiddenFields: [],
};

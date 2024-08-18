import { z } from "zod";
import { INVALID_ZOD_TYPES } from "../constants.js";

/** Validate if a schema is a valid schema for a MongoDB document. */
export function validateSchema<T extends z.ZodRawShape>(zod: z.ZodObject<T>) {
    for (let schema of Object.values(zod.shape)) {
        if (schema instanceof z.ZodObject) validateSchema(schema);
        else if (schema instanceof z.ZodArray) validateSchema(z.object({ element: schema.element }));
        else {
            const baseSchema = getBaseSchema(schema);
            if (!(baseSchema instanceof z.ZodType) || isInvalidType(baseSchema)) return false;
        }
    }

    return true;
}

/** Get the base schema of a Zod schema */
function getBaseSchema(schema: any): any {
    while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) schema = schema.unwrap();
    return schema;
}

/** Check if a schema is an invalid Zod type */
function isInvalidType(schema: any): boolean {
    return INVALID_ZOD_TYPES.some((invalidType) => schema instanceof invalidType);
}

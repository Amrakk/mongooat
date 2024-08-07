import { ZodRawShape, z } from "zod";
import { ZodBinary, ZodDecimal128, ZodObjectId, ZodRegExp, ZodTimestamp } from "../schema/index.js";

/** Validate if a schema is a valid schema for a MongoDB document */
export function validateSchema<T extends ZodRawShape>(zod: z.ZodObject<T>) {
    // TODO: handle custom types.
    for (let schema of Object.values(zod.shape)) {
        if (schema instanceof z.ZodObject) validateSchema(schema);
        else if (schema instanceof z.ZodArray) validateSchema(z.object({ element: schema.element }));
        else {
            const baseSchema = getBaseSchema(schema);
            if (
                !(
                    baseSchema instanceof z.ZodBoolean ||
                    baseSchema instanceof z.ZodDate ||
                    baseSchema instanceof z.ZodNumber ||
                    baseSchema instanceof z.ZodBigInt ||
                    baseSchema instanceof z.ZodNull ||
                    baseSchema instanceof z.ZodString ||
                    baseSchema instanceof z.ZodSymbol ||
                    isBsonType(baseSchema)
                )
            )
                return false;
        }
    }

    return true;
}

function getBaseSchema(schema: any): any {
    while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) schema = schema.unwrap();
    return schema;
}

function isBsonType(schema: any) {
    return [ZodBinary, ZodDecimal128, ZodObjectId, ZodRegExp, ZodTimestamp].includes(schema);
}

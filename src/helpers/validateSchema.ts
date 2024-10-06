import { z } from "zod";
import { InvalidSchemaMap } from "../types.js";
import InvalidSchemaError from "../errors/model/invalidSchema.js";
import { DEFAULT_ARRAY_PLACEHOLDER, INVALID_ID_ZOD_TYPES, INVALID_ZOD_TYPES } from "../constants.js";

/**
 * Validates a Zod schema to ensure it is compatible with MongoDB document structures.
 *
 * **Note:**
 * - The `_id` field must not be an `array`, `tuple`, `undefined`, or `unknown` type.
 * - Except for ZodObject and ZodArray, this does not yet apply to verifying nested schemas.
 *
 * @param {z.ZodObject<T>} zod - The Zod schema to validate.
 * @param {string} modelName - The name of the model being validated. Used in error reporting.
 * @throws {InvalidSchemaError} Throws an error if the schema contains invalid types.
 */
export function validateSchema<T extends z.ZodRawShape>(zod: z.ZodObject<T>, modelName: string): void {
    const err: InvalidSchemaMap = [];

    if (zod.shape._id instanceof z.ZodOptional) {
        const typeName = typeof zod.shape._id === "object" ? zod.shape._id.constructor.name : typeof zod.shape._id;
        err.push({ path: "_id", reason: `The '_id' field must not be an '${typeName}' type.` });
    }

    const idField = getBaseSchema(zod.shape._id);
    if (idField && (isInvalidIdField(idField) || isInvalidField(idField))) {
        const typeName = typeof idField === "object" ? idField.constructor.name : typeof idField;
        err.push({ path: "_id", reason: `The '_id' field must not be an '${typeName}' type.` });
    }

    const processSchema = (zod: z.ZodType, path: string = "") => {
        if (zod instanceof z.ZodObject) {
            const schema = zod.shape;
            for (let key of Object.keys(schema)) processSchema(schema[key], `${path ? path + "." : ""}${key}`);
        } else if (zod instanceof z.ZodArray) {
            processSchema(zod.element, `${path ? path + "." : ""}${DEFAULT_ARRAY_PLACEHOLDER}`);
        } else {
            const baseSchema = getBaseSchema(zod);
            if (!(baseSchema instanceof z.ZodType) || isInvalidField(baseSchema)) {
                const typeName = typeof baseSchema === "object" ? baseSchema.constructor.name : typeof baseSchema;
                err.push({ path, reason: `Schema type '${typeName}' is not allowed.` });
            }
        }
    };

    processSchema(idField ? zod.omit({ _id: true } as any) : zod);
    if (err.length > 0) throw new InvalidSchemaError(modelName, err);
}

/** Extracts the base schema by unwrapping optional and nullable Zod schemas */
function getBaseSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
    while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) schema = schema.unwrap();
    return schema;
}

/** Check if a schema is an invalid Zod type */
function isInvalidField(schema: z.ZodTypeAny): boolean {
    return INVALID_ZOD_TYPES.some((invalidType) => schema instanceof invalidType);
}

/** Check if `_id` field is an invalid ZodTypes */
function isInvalidIdField(schema: z.ZodTypeAny): boolean {
    return INVALID_ID_ZOD_TYPES.some((invalidType) => schema instanceof invalidType);
}

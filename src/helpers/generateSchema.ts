import { z } from "zod";
import { deleteZodField } from "./deleteField.js";

import type { ObjectKeyPaths } from "../types.js";

/**
 * Generate a new partial schema based on the original schema and the data provided.
 * @todo evaluate with others zod types
 */
export function createSchemaFromData<ST extends z.ZodRawShape>(
    schema: z.ZodObject<ST>,
    data: Record<string | number, unknown>
): z.ZodObject<ST> {
    const processSchema = (schema: z.ZodTypeAny, data: any): z.ZodTypeAny => {
        if (schema instanceof z.ZodObject) {
            const shape: z.ZodRawShape = {};
            const originalShape = schema.shape;

            for (const key in originalShape) {
                if (data.hasOwnProperty(key)) {
                    const fieldSchema = originalShape[key];
                    const fieldData = data[key];

                    shape[key] = processFieldSchema(fieldSchema, fieldData);
                }
            }

            return z.object(shape);
        }

        return schema;
    };

    const processFieldSchema = (schema: z.ZodTypeAny, data: any): z.ZodTypeAny => {
        if (Array.isArray(data)) {
            // Process the array like an object
            return processComplexArraySchema(schema, data);
        } else if (typeof data === "object" && data !== null) {
            return processComplexSchema(schema, data);
        }
        return schema; // Return as is for primitive types
    };

    const processComplexArraySchema = (schema: z.ZodTypeAny, data: any[]): z.ZodTypeAny => {
        // Check if the schema is wrapped in optional, nullable, or default
        let elementSchema = schema instanceof z.ZodArray ? schema.element : schema;

        // Capture default value if applicable
        let defaultValue: any = undefined;
        if (elementSchema instanceof z.ZodDefault) {
            defaultValue = elementSchema._def.defaultValue();
            elementSchema = elementSchema.removeDefault(); // Unwrap
        }

        // Unwrap the schema if necessary
        if (elementSchema instanceof z.ZodOptional) {
            elementSchema = elementSchema.unwrap();
        } else if (elementSchema instanceof z.ZodNullable) {
            elementSchema = elementSchema.unwrap();
        }

        // Process the first element of the array as an object
        const processedElementSchema = processSchema(elementSchema, data[0]);
        const arraySchema = z.array(processedElementSchema); // Create array schema

        // Apply default value if it exists
        if (defaultValue !== undefined) {
            return arraySchema.default([defaultValue]); // Return an array with the default value
        }

        return arraySchema; // Return the processed array schema
    };

    const processComplexSchema = (schema: z.ZodTypeAny, data: any): z.ZodTypeAny => {
        if (schema instanceof z.ZodObject) {
            return processSchema(schema, data);
        } else if (schema instanceof z.ZodOptional) {
            return processOptionalSchema(schema, data);
        } else if (schema instanceof z.ZodNullable) {
            return processNullableSchema(schema, data);
        } else if (schema instanceof z.ZodDefault) {
            return processDefaultSchema(schema, data);
        }

        return schema;
    };

    const processOptionalSchema = (schema: z.ZodOptional<any>, data: any): z.ZodTypeAny => {
        const unwrappedSchema = schema.unwrap();
        return processSchema(unwrappedSchema, data).optional();
    };

    const processNullableSchema = (schema: z.ZodNullable<any>, data: any): z.ZodTypeAny => {
        const unwrappedSchema = schema.unwrap();
        return processSchema(unwrappedSchema, data).nullable();
    };

    const processDefaultSchema = (schema: z.ZodDefault<any>, data: any): z.ZodTypeAny => {
        const defaultValue = schema._def.defaultValue();
        const unwrappedSchema = schema.removeDefault();
        return processSchema(unwrappedSchema, data).default(defaultValue);
    };

    return processSchema(schema, data) as z.ZodObject<ST>;
}

/**
 * Generate a new partial schema based on the original schema and the paths provided.
 * @todo evaluate with others zod types
 */
export function createSchemaFromPaths<T extends Record<string | number, unknown>, ST extends z.ZodRawShape>(
    schema: z.ZodObject<ST>,
    paths: ObjectKeyPaths<T>[]
): z.ZodObject<any> {
    if (paths.length === 0) return schema;

    const newSchema = z.object(Object.fromEntries(Object.keys(schema.shape).map((key) => [key, schema.shape[key]])));
    paths.filter((path, index, array) => array.indexOf(path) === index);

    for (const path of paths) deleteZodField(newSchema, path);
    return newSchema;
}

import { z, ZodTypeAny } from "zod";
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
        if (typeof data === "object" && data !== null) return processComplexSchema(schema, data);
        return schema;
    };

    const processArraySchema = (schema: z.ZodArray<ZodTypeAny>, data: any[]): z.ZodTypeAny => {
        const processedElementSchema = processSchema(schema.element, data[0]);
        const arraySchema = z.array(processedElementSchema);

        return arraySchema;
    };

    const processComplexSchema = (schema: z.ZodTypeAny, data: any): z.ZodTypeAny => {
        if (schema instanceof z.ZodObject) return processSchema(schema, data);
        else if (schema instanceof z.ZodArray) return processArraySchema(schema, data);
        else if (schema instanceof z.ZodOptional) return processOptionalSchema(schema, data);
        else if (schema instanceof z.ZodNullable) return processNullableSchema(schema, data);
        else if (schema instanceof z.ZodDefault) return processDefaultSchema(schema, data);

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

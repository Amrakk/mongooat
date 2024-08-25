import { z } from "zod";
import { ObjectKeyPaths } from "../types.js";
import { deleteZodField } from "./deleteField.js";

/**
 * Generate a new partial schema based on the original schema and the data provided.
 * @todo evaluate with others zod types
 */
export function createSchemaFromData<ST extends z.ZodRawShape>(
    schema: z.ZodObject<ST>,
    data: Record<keyof any, unknown>
): z.ZodObject<ST> {
    const newShape: z.ZodRawShape = {};

    const processSchema = (schema: z.ZodTypeAny, data: any, shape: z.ZodRawShape) => {
        if (schema instanceof z.ZodObject) {
            const originalShape = schema.shape;
            for (const key in originalShape) {
                if (key in data) {
                    if (Array.isArray(data[key]))
                        shape[key] = z.array(processSchema(originalShape[key].element, data[key][0], {}));
                    else if (typeof data[key] === "object" && data[key] !== null)
                        shape[key] = processSchema(originalShape[key], data[key], {});
                    else shape[key] = originalShape[key];
                }
            }
        }
        return z.object(shape);
    };

    return processSchema(schema, data, newShape) as z.ZodObject<ST>;
}

/**
 * Generate a new partial schema based on the original schema and the paths provided.
 * @todo evaluate with others zod types
 */
export function createSchemaFromPaths<T extends Record<keyof any, unknown>, ST extends z.ZodRawShape>(
    schema: z.ZodObject<ST>,
    paths: ObjectKeyPaths<T>[]
): z.ZodObject<any> {
    if (paths.length === 0) return schema;

    const newSchema = z.object(Object.fromEntries(Object.keys(schema.shape).map((key) => [key, schema.shape[key]])));
    paths.filter((path, index, array) => array.indexOf(path) === index);

    for (const path of paths) deleteZodField(newSchema, path);
    return newSchema;
}

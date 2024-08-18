import { z } from "zod";

/** Generate a new schema for update operations based on the original schema and the data provided. */
export function generateUpdateSchema<T extends z.ZodRawShape>(
    schema: z.ZodObject<T>,
    data: Record<keyof any, any>
): z.ZodObject<T> {
    const newShape: z.ZodRawShape = {};

    const processSchema = (schema: z.ZodTypeAny, obj: any, shape: z.ZodRawShape) => {
        if (schema instanceof z.ZodObject) {
            const originalShape = schema.shape;
            for (const key in originalShape) {
                if (key in obj) {
                    if (Array.isArray(obj[key]))
                        shape[key] = z.array(processSchema(originalShape[key].element, obj[key][0], {}));
                    else if (typeof obj[key] === "object" && obj[key] !== null)
                        shape[key] = processSchema(originalShape[key], obj[key], {});
                    else shape[key] = originalShape[key];
                }
            }
        }
        return z.object(shape);
    };

    return processSchema(schema, data, newShape) as z.ZodObject<T>;
}

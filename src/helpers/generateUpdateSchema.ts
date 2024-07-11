import { ZodObject, ZodRawShape, ZodTypeAny, z } from "zod";

/** Generate a new schema for update operations based on the original schema and the data provided. */
export function generateUpdateSchema<T extends ZodRawShape>(
    schema: ZodObject<T>,
    data: Record<string, any>
): ZodObject<any> {
    const newShape: ZodRawShape = {};

    const processSchema = (schema: ZodTypeAny, obj: any, shape: ZodRawShape) => {
        if (schema instanceof ZodObject) {
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

    return processSchema(schema, data, newShape);
}

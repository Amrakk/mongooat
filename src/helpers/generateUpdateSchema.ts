import { ZodObject, ZodRawShape, ZodTypeAny, z } from "zod";

/** Generate a new schema for update operations based on the original schema and the data provided. */
export function generateUpdateSchema<T extends ZodRawShape>(
    schema: ZodObject<T>,
    data: Record<string, any>
): ZodObject<T> {
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

    return processSchema(schema, data, newShape) as ZodObject<T>;
}

// export function generateMask<T extends ZodRawShape>(
//     schema: ZodObject<T>,
//     data: BSON.Document
// ): Record<string, true | undefined> {
//     const clone: Record<string, any> = {};

//     const processData = (schema: ZodObject<T>, obj: BSON.Document, target: Record<string, any>) => {
//         const shape = schema instanceof ZodObject ? schema.shape : ({} as ZodRawShape);

//         for (const key in shape) {
//             if (!(key in obj)) {
//                 if (key in schema.shape) schema.omit({ [key]: true } as any);
//                 target[key] = undefined;
//             } else if (obj[key] === undefined || obj[key] === null || typeof obj[key] !== "object") {
//                 target[key] = true;
//             } else if (Array.isArray(obj[key])) {
//                 if (obj[key].length > 0) {
//                     target[key] = [{}];
//                     processData((schema as any).shape[key].element, obj[key][0], target[key][0]);
//                 } else {
//                     target[key] = true;
//                 }
//             } else if (shape[key] instanceof ZodObject) {
//                 target[key] = {};
//                 processData(shape[key] as ZodObject<T>, obj[key], target[key]);
//                 if (Object.keys(target[key]).length === 0) target[key] = true;
//             } else {
//                 target[key] = true;
//             }
//         }
//     };

//     processData(schema, data, clone);
//     return clone;
// }

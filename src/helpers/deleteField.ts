import { DEFAULT_ARRAY_PATH_KEY } from "../constants.js";
import { ZodArray, ZodObject, ZodTypeAny } from "zod";

/**
 * Deletes the specified field from the provided object following the given path.
 *
 * **Note:**
 * - This function does not support maps, sets, and records.
 *
 * @todo
 * - Add support for maps, sets, and records.
 * - Test with nested unions, intersections, and discriminated unions.
 */
export function deleteField(obj: Record<keyof any, any>, path: string): void {
    const keys = path.split(".");
    let current: any = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i] === DEFAULT_ARRAY_PATH_KEY && Array.isArray(current))
            return current.forEach((item: any) => deleteField(item, keys.slice(i + 1).join(".")));
        if (current[keys[i]] === undefined) return;
        current = current[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    const index = Number(lastKey);

    if (!isNaN(index) && Array.isArray(current)) {
        if (index >= 0 && index < current.length) current.splice(index, 1);
    } else if (lastKey === DEFAULT_ARRAY_PATH_KEY && Array.isArray(current)) {
        current.splice(0, current.length);
    } else {
        delete current[lastKey];
    }
}

/**
 * Deletes the specified field from the provided Zod schema following the given path.
 *
 * **Note:**
 * - This function does not support maps, sets, and records.
 * - Except for `ZodObject` and `ZodArray`, this does not yet apply to verifying nested schemas.
 *
 * @todo
 * - Add support for maps, sets, and records.
 * - Test with nested unions, intersections, and discriminated unions.
 */
export function deleteZodField(schema: ZodTypeAny, path: string): void {
    const keys = path.split(".");
    let current: ZodTypeAny = schema;

    for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i] === DEFAULT_ARRAY_PATH_KEY && current instanceof ZodArray)
            return deleteZodField(current.element, keys.slice(i + 1).join("."));
        if (current instanceof ZodObject) {
            const originalShape = current.shape;
            if (keys[i] in originalShape) current = originalShape[keys[i]];
            else return;
        }
    }
    const lastKey = keys[keys.length - 1];
    if (current instanceof ZodObject) {
        const shape = current.shape;
        delete shape[lastKey];
    } else if (current instanceof ZodArray) {
        deleteZodField(current.element, lastKey);
    }
}

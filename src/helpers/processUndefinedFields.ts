import { DeepPartial } from "../types.js";

/**
 * Processes a document by identifying fields that are undefined and preparing it for MongoDB update operations.
 * This function returns two objects:
 * - `set`: A deep partial clone of the input data with all undefined fields removed.
 * - `unset`: A record that tracks fields with undefined values, formatted in dot-notation for MongoDB.
 *
 * @param data - The document to process, which may contain nested objects and arrays.
 * @returns An object containing two properties:
 * - `set`: A deep partial clone of the input data with undefined fields removed.
 * - `unset`: A record of fields (in dot-notation) that had undefined values.
 */
export function processUndefinedFieldsForUpdate<T extends Record<string | number, unknown>>(data: T) {
    const unset: Record<string | number, unknown> = {};

    const buildUnsetMap = (obj: any, parentKey: string = "") => {
        for (const key in obj) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            if (obj[key] === undefined) unset[fullKey] = "";
            else if (typeof obj[key] === "object" && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    obj[key].forEach((item: any, index: number) => {
                        buildUnsetMap(item, `${fullKey}.${index}`);
                    });
                } else buildUnsetMap(obj[key], fullKey);
            }
        }
    };

    buildUnsetMap(data);

    let set = removeEmptyObjects(removeUndefinedFields(structuredClone(data))) as DeepPartial<T>;
    return { set, unset };
}

/**
 * Removes undefined fields from a document by recursively traversing all properties, including nested objects and arrays.
 * - Undefined fields are deleted from their respective objects.
 * - Empty objects (with no properties) are also removed.
 * - In arrays, elements with undefined values are filtered out.
 *
 * @param data - The document to process, which may contain nested objects and arrays.
 * @returns The input document with all undefined fields removed, retaining the original structure.
 */
export function removeUndefinedFields<T extends Record<string | number, unknown> | Array<unknown>>(data: T): T {
    const cleanObject = (obj: any) => {
        if (Array.isArray(obj)) {
            obj = obj
                .filter((item) => item !== undefined)
                .map((item) => {
                    if (typeof item === "object" && item !== null) {
                        return cleanObject(item);
                    }
                    return item;
                });
        } else if (typeof obj === "object" && obj !== null) {
            for (const key in obj) {
                if (obj[key] === undefined) delete obj[key];
                else if (typeof obj[key] === "object" && obj[key] !== null) obj[key] = cleanObject(obj[key]);
            }
        }
        return obj;
    };

    return cleanObject(data);
}

// Utility function to check if a value is a plain object (not a special object like Date, RegExp, etc.)
function isPlainObject(value: unknown): value is Record<string | number, unknown> {
    return Object.prototype.toString.call(value) === "[object Object]";
}

function removeEmptyObjects<T extends Record<string | number, unknown>>(obj: T): T {
    for (const key in obj) {
        const value = obj[key];

        if (isPlainObject(value)) {
            obj[key] = removeEmptyObjects(value);
            if (Object.keys(obj[key] as object).length === 0) delete obj[key];
        }
    }
    return obj;
}

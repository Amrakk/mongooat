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
export function processUndefinedFieldsForUpdate<T extends Record<keyof any, any>>(data: T) {
    const unset: Record<keyof any, any> = {};

    const buildUnsetMap = (obj: any, parentKey: string = "") => {
        for (const key in obj) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            if (obj[key] === undefined) {
                unset[fullKey] = "";
            } else if (typeof obj[key] === "object" && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    obj[key].forEach((item: any, index: number) => {
                        buildUnsetMap(item, `${fullKey}.${index}`);
                    });
                } else {
                    buildUnsetMap(obj[key], fullKey);
                }
            }
        }
    };

    buildUnsetMap(data);

    const set = removeUndefinedFields(structuredClone(data));
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
export function removeUndefinedFields<T extends Record<keyof any, any>>(data: T): DeepPartial<T> {
    const cleanObject = (obj: any) => {
        for (const key in obj) {
            if (obj[key] === undefined) {
                delete obj[key];
            } else if (typeof obj[key] === "object" && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    obj[key] = obj[key].filter((item: any) => item !== undefined);
                    obj[key].forEach(cleanObject);
                } else {
                    cleanObject(obj[key]);
                    if (Object.keys(obj[key]).length === 0) delete obj[key];
                }
            }
        }
    };

    cleanObject(data);
    return data;
}

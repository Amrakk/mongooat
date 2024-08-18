import { DEFAULT_ARRAY_PATH_KEY } from "../constants.js";

/**
 * Deletes the specified field from the provided object following the given path.
 *
 * @todo Add support for unions, discriminated unions, intersections, maps, sets, and records.
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
    } else {
        delete current[lastKey];
    }
}

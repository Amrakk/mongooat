/** Processes undefined fields in a document for MongoDB update operations. */
export function processUndefinedFieldsForUpdate<T extends Record<keyof any, any>>(data: T) {
    let set: Partial<T> = {};
    let unset: Record<string, any> = {};

    const processField = (obj: T, parentKey: string = "", resultSet: any = set) => {
        for (const key in obj) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            if (obj[key] === undefined) {
                // Mark unset for this field
                unset[fullKey] = "";
                // Remove parent key from set if it exists
                if (parentKey && !unset[parentKey]) delete set[parentKey];
            } else if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
                // Process nested object
                resultSet[key] = Array.isArray(obj[key]) ? [...obj[key]] : {};
                processField(obj[key], fullKey, resultSet[key]);
            } else {
                // Copy non-undefined values to set
                resultSet[key] = obj[key];
            }
        }
    };

    processField(data);
    return { set, unset };
}

/** Remove undefined fields from a document. */
export function removeUndefinedFields<T extends Record<keyof any, any>>(data: T): T {
    const processField = (obj: T) => {
        for (const key in data) {
            if (obj[key] === undefined) delete obj[key];
            else if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key]))
                processField(obj[key]);
        }
    };

    processField(data);
    return data;
}

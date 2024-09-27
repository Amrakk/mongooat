import { BSON } from "mongodb";

const { Decimal128, ObjectId } = BSON;
const specialProperties = new Set(["__proto__", "constructor", "prototype"]);

export function clone<T>(obj: T): T {
    if (obj == null || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) return cloneArray(obj) as T;
    if (obj instanceof Date) return new Date(+obj) as T;
    if (obj instanceof RegExp) return cloneRegExp(obj) as T;
    if (obj instanceof ObjectId) return new ObjectId(obj.toString()) as T;
    if (obj instanceof Decimal128) return Decimal128.fromString(obj.toString()) as T;

    const objConstructor = obj.constructor ? obj.constructor.name : null;
    if (objConstructor === "Object") return cloneObject(obj);

    return typeof obj.valueOf === "function" ? (obj.valueOf() as T) : cloneObject(obj);
}

function cloneObject<T extends Record<string, any>>(obj: T): T {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
        if (!specialProperties.has(key)) result[key] = clone(obj[key]);
    });

    return result as T;
}

function cloneArray<T>(arr: T[]): T[] {
    return arr.map(clone);
}

function cloneRegExp(regexp: RegExp): RegExp {
    const cloned = new RegExp(regexp.source, regexp.flags);
    cloned.lastIndex = regexp.lastIndex;
    return cloned;
}

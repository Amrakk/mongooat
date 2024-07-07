import { z } from "zod";
import { ObjectId } from "mongodb";

/**
 * `ObjectIDSchema` is a Zod schema designed for validating MongoDB ObjectIds.
 */
export const ObjectIDSchema = z
    .custom<ObjectId>((value) => ObjectId.isValid(value), {
        message: "Invalid ObjectID",
    })
    .optional();

import { z } from "zod";
import { ObjectId } from "mongodb";

/** `ZodObjectId` is a Zod schema designed for validating MongoDB ObjectIds. */
export const ZodObjectId = z
    .custom<ObjectId>((value) => ObjectId.isValid(value), {
        message: "Invalid ObjectID",
    })
    ;

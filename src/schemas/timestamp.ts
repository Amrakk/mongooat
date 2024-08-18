import { z } from "zod";
import { BSON } from "mongodb";

/** `ZodTimestamp` is a Zod schema designed for validating MongoDB Timestamp. */
export const ZodTimestamp = z.custom<BSON.Timestamp>((value) => value instanceof BSON.Timestamp, {
    message: "Invalid Timestamp",
});

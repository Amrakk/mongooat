import { z } from "zod";
import { BSON } from "mongodb";

/** `ZodRegExp` is a Zod schema designed for validating MongoDB BSONRegExp. */
export const ZodRegExp = z.custom<BSON.BSONRegExp>((value) => value instanceof BSON.BSONRegExp, {
    message: "Invalid BSONRegExp",
});

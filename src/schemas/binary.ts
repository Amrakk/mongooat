import { z } from "zod";
import { BSON } from "mongodb";

/** `ZodBinary` is a Zod schema designed for validating MongoDB Binary. */
export const ZodBinary = z.custom<BSON.Binary>((value) => value instanceof BSON.Binary, {
    message: "Invalid Binary",
});

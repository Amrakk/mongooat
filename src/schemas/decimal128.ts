import { z } from "zod";
import { BSON } from "mongodb";

/** `ZodDecimal128` is a Zod schema designed for validating MongoDB Decimal128. */
export const ZodDecimal128 = z.custom<BSON.Decimal128>((value) => value instanceof BSON.Decimal128, {
    message: "Invalid Decimal128",
});

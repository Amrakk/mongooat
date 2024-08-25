import { z } from "zod";
import { assert } from "chai";
import { ZodObjectId } from "../../src/schemas/objectid.js";
import { DEFAULT_ARRAY_PATH_KEY } from "../../src/constants.js";
import { assertErrorInstace } from "../utils/assertErrorInstace.js";
import { validateSchema } from "../../src/helpers/validateSchema.js";
import InvalidSchemaError from "../../src/error/model/invalidSchema.js";

describe("helpers.validateSchema", () => {
    /**
     * Validate '_id' field
     */
    describe("validate '_id' field", () => {
        it("should not throw InvalidSchemaError for a valid schema with '_id' fields", () => {
            const schema = z.object({
                _id: ZodObjectId,
                name: z.string(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should throw InvalidSchemaError when the '_id' field is an 'ZodArray'", () => {
            const schema = z.object({
                _id: z.array(z.string()),
                name: z.string(),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "_id", reason: `The '_id' field must not be an 'ZodArray' type.` },
                ])
            );
        });

        it("should throw InvalidSchemaError when the '_id' field is a 'ZodTuple'", () => {
            const schema = z.object({
                _id: z.tuple([z.string()]),
                name: z.string(),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "_id", reason: `The '_id' field must not be an 'ZodTuple' type.` },
                ])
            );
        });
    });

    /**
     * Validate standard fields
     */
    describe("validate other fields", () => {
        it("should not throw InvalidSchemaError for a valid schema with standard fields", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.string(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should not throw InvalidSchemaError for a valid schema with optional fields", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.string().optional(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should throw InvalidSchemaError for invalid Zod types", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.promise(z.string()),
            });

            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [{ path: "name", reason: `Schema type 'ZodPromise' is not allowed.` }])
            );
        });

        it("should throw InvalidSchemaError for an invalid optional field in the schema", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.promise(z.string()).optional(),
            });

            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [{ path: "name", reason: `Schema type 'ZodPromise' is not allowed.` }])
            );
        });

        it("should throw InvalidSchemaError when the schema has an invalid field within nested objects", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.object({
                    first: z.string(),
                    last: z.promise(z.string()),
                }),
            });

            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "name.last", reason: `Schema type 'ZodPromise' is not allowed.` },
                ])
            );
        });

        it("should throw InvalidSchemaError for a deeply nested invalid field", () => {
            const schema = z.object({
                _id: z.string(),
                nested: z.object({
                    level1: z.object({
                        level2: z.promise(z.string()),
                    }),
                }),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "nested.level1.level2", reason: `Schema type 'ZodPromise' is not allowed.` },
                ])
            );
        });
    });

    /**
     * Validate multiple fields
     */
    describe("validate multiple fields", () => {
        it("should throw InvalidSchemaError for multiple invalid fields", () => {
            const schema = z.object({
                _id: z.array(z.string()),
                age: z.promise(z.number()),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "_id", reason: `The '_id' field must not be an 'ZodArray' type.` },
                    { path: "age", reason: `Schema type 'ZodPromise' is not allowed.` },
                ])
            );
        });

        it("should throw InvalidSchemaError for mixed valid and invalid fields", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.string(),
                age: z.promise(z.number()),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [{ path: "age", reason: `Schema type 'ZodPromise' is not allowed.` }])
            );
        });

        it("should throw InvalidSchemaError when multiple fields are invalid in a deeply nested object", () => {
            const schema = z.object({
                _id: z.string(),
                profile: z.object({
                    info: z.object({
                        age: z.promise(z.number()),
                        birthday: z.promise(z.string()),
                    }),
                    address: z.object({
                        street: z.string(),
                        zipCode: z.promise(z.string()),
                    }),
                }),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "profile.info.age", reason: `Schema type 'ZodPromise' is not allowed.` },
                    { path: "profile.info.birthday", reason: `Schema type 'ZodPromise' is not allowed.` },
                    { path: "profile.address.zipCode", reason: `Schema type 'ZodPromise' is not allowed.` },
                ])
            );
        });

        it("should throw InvalidSchemaError when an array of objects has multiple invalid fields", () => {
            const schema = z.object({
                _id: z.string(),
                tags: z.array(
                    z.object({
                        name: z.string(),
                        relevance: z.promise(z.number()),
                    })
                ),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    {
                        path: `tags.${DEFAULT_ARRAY_PATH_KEY}.relevance`,
                        reason: `Schema type 'ZodPromise' is not allowed.`,
                    },
                ])
            );
        });

        it("should throw InvalidSchemaError when invalid fields are spread across multiple nested arrays", () => {
            const schema = z.object({
                _id: z.string(),
                categories: z.array(
                    z.object({
                        name: z.string(),
                        tags: z.array(
                            z.object({
                                relevance: z.promise(z.number()),
                            })
                        ),
                    })
                ),
            });
            assertErrorInstace(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    {
                        path: `categories.${DEFAULT_ARRAY_PATH_KEY}.tags.${DEFAULT_ARRAY_PATH_KEY}.relevance`,
                        reason: `Schema type 'ZodPromise' is not allowed.`,
                    },
                ])
            );
        });
    });
});

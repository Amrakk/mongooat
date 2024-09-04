import { z } from "zod";
import { assert } from "chai";
import { ZodObjectId } from "../../src/schemas/objectid.js";
import { DEFAULT_ARRAY_PLACEHOLDER } from "../../src/constants.js";
import { assertErrorInstance } from "../utils/assertErrorInstance.js";
import { validateSchema } from "../../src/helpers/validateSchema.js";
import InvalidSchemaError from "../../src/error/model/invalidSchema.js";

describe("helpers.validateSchema", () => {
    /**
     * Validate '_id' field
     */
    describe("validate '_id' field", () => {
        it("should not throw InvalidSchemaError when the '_id' field is a valid Zod type", () => {
            const schema = z.object({
                _id: ZodObjectId,
                name: z.string(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should not throw InvalidSchemaError when the '_id' field is a optional valid Zod type", () => {
            const schema = z.object({
                _id: ZodObjectId.optional(),
                name: z.string(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should not throw InvalidSchemaError when the '_id' field is a nullable valid Zod type", () => {
            const schema = z.object({
                _id: ZodObjectId.nullable(),
                name: z.string(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should throw InvalidSchemaError when the '_id' field is an invalid Zod type", () => {
            const schema = z.object({
                _id: z.array(z.string()),
                name: z.string(),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "_id", reason: "The '_id' field must not be an 'ZodArray' type." },
                ])
            );
        });

        it("should throw InvalidSchemaError when the '_id' field is an optional invalid Zod type", () => {
            const schema = z.object({
                _id: z.array(z.string()).optional(),
                name: z.string(),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "_id", reason: "The '_id' field must not be an 'ZodArray' type." },
                ])
            );
        });

        it("should throw InvalidSchemaError when the '_id' field is a nullable invalid Zod type", () => {
            const schema = z.object({
                _id: z.array(z.string()).nullable(),
                name: z.string(),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "_id", reason: "The '_id' field must not be an 'ZodArray' type." },
                ])
            );
        });
    });

    /**
     * Validate standard fields
     */
    describe("validate standard fields", () => {
        it("should not throw InvalidSchemaError when the field is a valid Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.string(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should not throw InvalidSchemaError when the field is a valid optional Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.string().optional(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should not throw InvalidSchemaError when the field is a valid nullable Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.string().nullable(),
            });
            assert.doesNotThrow(() => validateSchema(schema, "test"));
        });

        it("should throw InvalidSchemaError when the field is an invalid Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.promise(z.string()),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [{ path: "name", reason: `Schema type 'ZodPromise' is not allowed.` }])
            );
        });

        it("should throw InvalidSchemaError when the field is an invalid optional Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.promise(z.string()).optional(),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [{ path: "name", reason: `Schema type 'ZodPromise' is not allowed.` }])
            );
        });

        it("should throw InvalidSchemaError when the field is an invalid nullable Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.promise(z.string()).nullable(),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [{ path: "name", reason: `Schema type 'ZodPromise' is not allowed.` }])
            );
        });

        it("should throw InvalidSchemaError when the field is an invalid nested Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.object({
                    first: z.string(),
                    last: z.promise(z.string()),
                }),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "name.last", reason: `Schema type 'ZodPromise' is not allowed.` },
                ])
            );
        });

        it("should throw InvalidSchemaError when a field is both optional and nullable but contains an invalid Zod type", () => {
            const schema = z.object({
                _id: z.string(),
                name: z.promise(z.string()).optional().nullable(),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [{ path: "name", reason: `Schema type 'ZodPromise' is not allowed.` }])
            );
        });

        it("should throw InvalidSchemaError when an array of objects contains multiple invalid fields", () => {
            const schema = z.object({
                _id: z.string(),
                tags: z.array(
                    z.object({
                        name: z.string(),
                        relevance: z.promise(z.number()),
                    })
                ),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    {
                        path: `tags.${DEFAULT_ARRAY_PLACEHOLDER}.relevance`,
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
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    {
                        path: `categories.${DEFAULT_ARRAY_PLACEHOLDER}.tags.${DEFAULT_ARRAY_PLACEHOLDER}.relevance`,
                        reason: `Schema type 'ZodPromise' is not allowed.`,
                    },
                ])
            );
        });

        it("should throw InvalidSchemaError when an array contains other arrays with invalid fields in nested objects", () => {
            const schema = z.object({
                _id: z.string(),
                tags: z.array(
                    z.array(
                        z.object({
                            relevance: z.promise(z.number()),
                        })
                    )
                ),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    {
                        path: `tags.${DEFAULT_ARRAY_PLACEHOLDER}.${DEFAULT_ARRAY_PLACEHOLDER}.relevance`,
                        reason: `Schema type 'ZodPromise' is not allowed.`,
                    },
                ])
            );
        });
    });

    /**
     * Validate multiple fields
     */
    describe("validate multiple fields", () => {
        it("should throw InvalidSchemaError when multiple fields are invalid", () => {
            const schema = z.object({
                _id: z.array(z.string()),
                age: z.promise(z.number()),
            });
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "_id", reason: `The '_id' field must not be an 'ZodArray' type.` },
                    { path: "age", reason: `Schema type 'ZodPromise' is not allowed.` },
                ])
            );
        });

        it("should throw InvalidSchemaError when multiple fields are invalid in a nested object", () => {
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
            assertErrorInstance(
                () => validateSchema(schema, "test"),
                new InvalidSchemaError("test", [
                    { path: "profile.info.age", reason: `Schema type 'ZodPromise' is not allowed.` },
                    { path: "profile.info.birthday", reason: `Schema type 'ZodPromise' is not allowed.` },
                    { path: "profile.address.zipCode", reason: `Schema type 'ZodPromise' is not allowed.` },
                ])
            );
        });
    });
});

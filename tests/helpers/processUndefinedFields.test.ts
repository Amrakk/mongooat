import { assert } from "chai";
import { processUndefinedFieldsForUpdate, removeUndefinedFields } from "../../src/helpers/processUndefinedFields.js";

describe("helpers.processUndefinedFields", () => {
    /**
     * Test the processUndefinedFieldsForUpdate function.
     */
    describe("processUndefinedFieldsForUpdate", () => {
        it("should process object with no undefined fields", () => {
            const data = { name: "John", age: 30 };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, { set: { name: "John", age: 30 }, unset: {} });
        });

        it("should process object with undefined fields", () => {
            const data: any = { name: "John", age: undefined };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, { set: { name: "John" }, unset: { age: "" } });
        });

        it("should process nested object with undefined fields", () => {
            const data = { name: "John", profile: { age: undefined, city: "New York" } };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, {
                set: { name: "John", profile: { city: "New York" } },
                unset: { "profile.age": "" },
            });
        });

        it("should process object with nested object having no undefined fields", () => {
            const data = { name: "John", profile: { age: 30, city: "New York" } };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, {
                set: { name: "John", profile: { age: 30, city: "New York" } },
                unset: {},
            });
        });

        it("should handle empty object correctly", () => {
            const data = {};
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, { set: {}, unset: {} });
        });

        it("should handle nested object with mixed undefined and non-undefined fields", () => {
            const data = { profile: { name: "John", details: { age: undefined, city: "New York" } } };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, {
                set: { profile: { name: "John", details: { city: "New York" } } },
                unset: { "profile.details.age": "" },
            });
        });

        it("should correctly remove parent key from set if child key is unset", () => {
            const data = { profile: { age: undefined } };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, { set: {}, unset: { "profile.age": "" } });
        });

        it("should correctly remove empty objects", () => {
            const date = new Date();
            const data = { profile: { age: undefined, details: {}, date } };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, {
                set: { profile: { date } },
                unset: { "profile.age": "" },
            });
        });

        it("should handle arrays correctly when processing undefined fields", () => {
            const data = {
                items: [
                    { name: "item1", value: undefined },
                    { name: undefined, value: 10 },
                    { name: "item3", value: 20 },
                ],
                otherField: undefined,
            };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, {
                set: {
                    items: [{ name: "item1" }, { value: 10 }, { name: "item3", value: 20 }],
                },
                unset: {
                    "items.0.value": "",
                    "items.1.name": "",
                    otherField: "",
                },
            });
        });

        it("should handle nested arrays correctly when processing undefined fields", () => {
            const data = {
                items: [
                    {
                        subItems: [
                            { name: "subItem1", value: undefined },
                            { name: undefined, value: 5 },
                        ],
                    },
                    {
                        subItems: [
                            { name: "subItem2", value: 15 },
                            { name: undefined, value: undefined },
                        ],
                    },
                ],
            };
            const result = processUndefinedFieldsForUpdate(data);
            assert.deepEqual(result, {
                set: {
                    items: [
                        { subItems: [{ name: "subItem1" }, { value: 5 }] },
                        { subItems: [{ name: "subItem2", value: 15 }, {}] },
                    ],
                },
                unset: {
                    "items.0.subItems.0.value": "",
                    "items.0.subItems.1.name": "",
                    "items.1.subItems.1.name": "",
                    "items.1.subItems.1.value": "",
                },
            });
        });
    });

    /**
     * Test the removeUndefinedFields function.
     */
    describe("removeUndefinedFields", () => {
        it("should remove undefined fields from flat object", () => {
            const data = { name: "John", age: undefined };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { name: "John" });
        });

        it("should remove undefined fields from nested object", () => {
            const data = { name: "John", profile: { age: undefined, city: "New York" } };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { name: "John", profile: { city: "New York" } });
        });

        it("should handle object with no undefined fields", () => {
            const data = { name: "John", age: 30 };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { name: "John", age: 30 });
        });

        it("should handle empty object", () => {
            const data = {};
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, {});
        });

        it("should remove undefined fields from deeply nested objects", () => {
            const data = { profile: { name: "John", details: { age: undefined, city: "New York" } } };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { profile: { name: "John", details: { city: "New York" } } });
        });

        it("should remove undefined fields from array of objects", () => {
            const data = {
                tags: [
                    { name: "tag1", relevance: undefined },
                    { name: "tag2", relevance: 5 },
                ],
            };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { tags: [{ name: "tag1" }, { name: "tag2", relevance: 5 }] });
        });

        it("should remove undefined fields from array of objects", () => {
            const data = {
                tags: [
                    { name: "tag1", relevance: undefined },
                    { name: "tag2", relevance: 5 },
                ],
            };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { tags: [{ name: "tag1" }, { name: "tag2", relevance: 5 }] });
        });

        it("should remove undefined fields from an array containing undefined values", () => {
            const data = { items: [undefined, "apple", undefined, "banana"] };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { items: ["apple", "banana"] });
        });

        it("should remove undefined fields from an object with nested arrays", () => {
            const data = {
                name: "John",
                tags: [
                    { name: "tag1", value: undefined },
                    { name: "tag2", value: 5 },
                ],
            };
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, { name: "John", tags: [{ name: "tag1" }, { name: "tag2", value: 5 }] });
        });

        it("should remove undefined fields from array", () => {
            const data = ["apple", undefined, "banana", undefined];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, ["apple", "banana"]);
        });

        it("should remove undefined fields from deeply nested arrays", () => {
            const data = [
                {
                    name: "item1",
                    tags: [
                        { name: "tag1", value: undefined },
                        { name: "tag2", value: 5 },
                    ],
                },
                {
                    name: "item2",
                    tags: [
                        { name: "tag3", value: 10 },
                        { name: "tag4", value: undefined },
                    ],
                },
            ];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, [
                { name: "item1", tags: [{ name: "tag1" }, { name: "tag2", value: 5 }] },
                { name: "item2", tags: [{ name: "tag3", value: 10 }, { name: "tag4" }] },
            ]);
        });
        it("should handle array of primitives with undefined values", () => {
            const data = [undefined, 1, undefined, 2, 3, undefined];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, [1, 2, 3]);
        });

        it("should handle array of objects with undefined fields", () => {
            const data = [
                { name: "Alice", age: undefined },
                { name: "Bob", age: 30 },
                { name: "Charlie", age: undefined },
            ];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, [{ name: "Alice" }, { name: "Bob", age: 30 }, { name: "Charlie" }]);
        });

        it("should handle deeply nested arrays with mixed types", () => {
            const data = [
                {
                    id: 1,
                    values: [
                        { key: "a", value: undefined } as { key: string; value?: number },
                        { key: "b", value: "foo" },
                    ],
                },
                {
                    id: 2,
                    values: [undefined, { key: "c", value: "bar" }],
                },
            ];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, [
                {
                    id: 1,
                    values: [{ key: "a" }, { key: "b", value: "foo" }],
                },
                {
                    id: 2,
                    values: [{ key: "c", value: "bar" }],
                },
            ]);
        });

        it("should handle deeply nested arrays with undefined values", () => {
            const data = [
                [undefined, 1, 2],
                [3, undefined, 4],
                [5, 6, undefined],
            ];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, [
                [1, 2],
                [3, 4],
                [5, 6],
            ]);
        });

        it("should handle an array with all elements undefined", () => {
            const data = [undefined, undefined, undefined];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, []);
        });

        it("should handle empty array", () => {
            const data: unknown[] = [];
            const result = removeUndefinedFields(data);
            assert.deepEqual(result, []);
        });
    });
});

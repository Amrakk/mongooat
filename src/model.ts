import { deleteField } from "./helpers/deleteField.js";
import { DEFAULT_ARRAY_PLACEHOLDER } from "./constants.js";
import { validateSchema } from "./helpers/validateSchema.js";
import { DefaultModelOptions, ModelOptions } from "./options/modelOptions.js";
import { createSchemaFromData, createSchemaFromPaths } from "./helpers/generateSchema.js";
import { processUndefinedFieldsForUpdate, removeUndefinedFields } from "./helpers/processUndefindedFields.js";

import ValidateError from "./error/validate.js";
import MissingModelNameError from "./error/model/missingModelName.js";
import IdFieldNotAllowedError from "./error/model/idFieldNotAllowed.js";

import type { ZodObject, ZodRawShape } from "zod";
import type { ParseOptions } from "./options/parseOptions.js";
import type {
    OmitId,
    IdField,
    Flatten,
    DeepPartial,
    ResolvePath,
    ObjectKeyPaths,
    BulkWriteErrorMap,
    BulkWriteResultMap,
    MGIndexDescription,
    MGIndexSpecification,
    MGCreateIndexesOptions,
} from "./types.js";
import type {
    Db,
    BSON,
    Filter,
    Collection,
    FindOptions,
    DeleteResult,
    ModifyResult,
    UpdateResult,
    DeleteOptions,
    UpdateOptions,
    ReplaceOptions,
    DistinctOptions,
    InsertOneResult,
    AggregateOptions,
    BulkWriteOptions,
    InsertManyResult,
    IndexDescription,
    InsertOneOptions,
    AggregationCursor,
    ListIndexesCursor,
    DropIndexesOptions,
    IndexSpecification,
    ListIndexesOptions,
    AnyBulkWriteOperation,
    CountDocumentsOptions,
    SearchIndexDescription,
    FindOneAndUpdateOptions,
    FindOneAndDeleteOptions,
    ListSearchIndexesCursor,
    FindOneAndReplaceOptions,
    ListSearchIndexesOptions,
    OptionalUnlessRequiredId,
    UpdateFilter,
} from "mongodb";

/** Extracts the type of a model instance. */
export type TypeOf<T extends Model<any, any>> = T["_type"];

/** Extracts the type dot-notation paths of a model instance. */
export type GetPaths<T extends Model<any, any>> = T["_paths"];

/** Update type for a model instance. */
export type UpdateType<T> = DeepPartial<OmitId<T>>;

/**
 * Represents a model that maps to a MongoDB collection and defines the structure of documents within that collection
 * using a Zod schema for validation. This class provides a foundation for creating, reading, updating, and deleting
 * documents in a type-safe manner.
 *
 * @template Type - The TypeScript type that represents the shape of documents in the MongoDB collection.
 * @template SchemaType - The shape of the schema used for validation, defined using Zod.
 */
export class Model<Type extends Record<string | number, unknown>, SchemaType extends ZodRawShape> {
    private _db: Db;
    private _name: string;
    private _schema: ZodObject<SchemaType>;
    private _collection: Collection<Type>;
    private _options: Required<ModelOptions<Type>>;

    readonly _type: Type = {} as Type;
    readonly _paths: ObjectKeyPaths<Type>[] = [] as ObjectKeyPaths<Type>[];

    constructor(name: string, schema: ZodObject<SchemaType>, db: Db, options?: Partial<ModelOptions<Type>>) {
        if (!name || name.length === 0) throw new MissingModelNameError();
        validateSchema(schema, name);

        this._db = db;
        this._name = name;
        this._schema = schema;

        options = options ?? {};
        options.collectionName = options.collectionName ?? name;
        this._options = { ...DefaultModelOptions, ...options };
        this._collection = db.collection(this.options.collectionName);
    }

    /** A getter for the model's name. */
    public get name(): string {
        return this._name;
    }

    /** A getter for the model's schema. */
    public get schema(): ZodObject<SchemaType> {
        return this._schema;
    }

    /** A getter for the model's collection. */
    public get collection(): Collection<Type> {
        return this._collection;
    }

    /** A setter for the model's collection. */
    public set collection(collection: Collection<Type>) {
        this._collection = collection;
    }

    /** A getter for the model's options. */
    public get options(): Required<ModelOptions<Type>> {
        return this._options;
    }

    /** A getter for the model's checkOnGet option. */
    private get checkOnGet(): boolean {
        return this._options.checkOnGet ?? DefaultModelOptions.checkOnGet;
    }

    /**
     * Parses the provided data object using the model's schema and returns the result as a document of the specified type.
     *
     * @param {Record<string | number, unknown>} data - The data object to parse.
     * @param {ParseOptions<Type>} option - Optional settings for the parse operation.
     *
     * @returns {Promise<Type | DeepPartial<Type>>} The parsed document object.
     */
    public async parse(data: Record<string | number, unknown>): Promise<Type>;
    public async parse(data: Record<string | number, unknown>, option?: ParseOptions<Type>): Promise<DeepPartial<Type>>;
    public async parse(
        data: Record<string | number, unknown>,
        option?: ParseOptions<Type>
    ): Promise<Type | DeepPartial<Type>> {
        const isPartial = option && "isPartial" in option ? option.isPartial : false;
        const partialFields = option && "partialFields" in option ? option.partialFields : undefined;

        const schema = isPartial
            ? createSchemaFromData(this.schema, data)
            : partialFields && partialFields.length > 0
            ? createSchemaFromPaths(this.schema, partialFields)
            : this.schema;
        const test = await schema.strict().safeParseAsync(data);

        if (!test.success) throw new ValidateError(this.name, test.error.errors);
        return data as Type | Partial<Type>;
    }

    /**
     * Attempts to parse the provided data object using the model's schema and returns a boolean value indicating
     * whether the parsing was successful.
     *
     * @param {Record<string | number, unknown>} data - The data object to parse.
     * @param {ParseOptions<Type>} option - Optional settings for the parse operation.
     *
     * @returns {Promise<boolean>} A boolean value indicating whether the parsing was successful.
     */
    public async tryParse(data: Record<string | number, unknown>, option?: ParseOptions<Type>): Promise<boolean> {
        const isPartial = option && "isPartial" in option ? option.isPartial : false;
        const partialFields = option && "partialFields" in option ? option.partialFields : undefined;

        const schema = isPartial
            ? createSchemaFromData(this.schema, data)
            : partialFields && partialFields.length > 0
            ? createSchemaFromPaths(this.schema, partialFields)
            : this.schema;
        return schema.safeParseAsync(data).then((res) => res.success);
    }

    /**
     * Hides the specified fields from the provided data object or array of objects.
     * Hidden field values are set to `undefined`, so be aware of potential impacts
     * on data integrity and validation.
     *
     * **Note:**
     * Unsupported nested types:
     * - Maps, Sets, Records
     *
     * @param {Type} data - The data object or array of objects from which to hide fields.
     * @param {ObjectKeyPaths<Type>[]}  hiddenFields - An optional array of field names to hide from the data object(s).
     *
     * @returns {DeepPartial<Type> | DeepPartial<Type>[]} The data object or array of objects with the specified fields hidden.
     */
    public hideFields(data: Type, hiddenFields?: ObjectKeyPaths<Type>[]): DeepPartial<Type>;
    public hideFields(data: Type[], hiddenFields?: ObjectKeyPaths<Type>[]): DeepPartial<Type>[];
    public hideFields(
        data: Type | Type[],
        hiddenFields?: ObjectKeyPaths<Type>[]
    ): DeepPartial<Type> | DeepPartial<Type>[] {
        hiddenFields = hiddenFields ?? this.options.hiddenFields ?? [];
        if (hiddenFields?.length === 0) return data;

        hiddenFields.filter((field, index, array) => array.indexOf(field) === index);

        const processItem = (item: Type) => {
            for (const field of hiddenFields) deleteField(item, field);
            return item;
        };

        return Array.isArray(data) ? data.map(processItem) : processItem(data);
    }

    /**
     * Counts the number of documents in the collection that match the specified filter criteria.
     *
     * @param {Filter<Type>} filter - Optional filter criteria to apply to the count operation.
     * @param {CountDocumentsOptions} options - Optional settings for the countDocuments operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/CountDocumentsOptions.html this}.
     *
     * @returns {Promise<number>} A promise that resolves to the number of documents matching the criteria.
     */
    public countDocuments(filter?: Filter<Type>, options?: CountDocumentsOptions): Promise<number> {
        return this.collection.countDocuments(filter, options);
    }

    /**
     * Estimates the number of documents in the collection using collection metadata.
     *
     * This is faster than using `countDocuments()` for large collections.
     *
     * @param {CountDocumentsOptions} options - Optional settings for the countDocuments operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/CountDocumentsOptions.html this}.
     *
     * @returns {Promise<number>} A promise that resolves to the estimated number of documents in the collection.
     */
    public estimatedDocumentCount(options?: CountDocumentsOptions): Promise<number> {
        return this.collection.estimatedDocumentCount(options);
    }

    /**
     * Get the distinct values of the specified field in the collection.
     *
     * @param {Key} key - The field for which to return distinct values.
     * @param {Filter<Type>} filter - Optional filter criteria to apply to the distinct operation.
     * @param {DistinctOptions} options - Optional settings for the distinct operation. Learn more at
     *                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/types/DistinctOptions.html this}.
     *
     * @returns {Promise<Flatten<ResolvePath<Type, Key>>[]>} A promise that resolves to an array of distinct values.
     */
    public distinct<Key extends ObjectKeyPaths<Type>>(key: Key): Promise<Flatten<ResolvePath<Type, Key>>[]>;
    public distinct<Key extends ObjectKeyPaths<Type>>(
        key: Key,
        filter: Filter<Type>
    ): Promise<Flatten<ResolvePath<Type, Key>>[]>;
    public distinct<Key extends ObjectKeyPaths<Type>>(
        key: Key,
        filter: Filter<Type>,
        options: DistinctOptions
    ): Promise<Flatten<ResolvePath<Type, Key>>[]>;
    public distinct<Key extends ObjectKeyPaths<Type>>(
        key: Key,
        filter?: Filter<Type>,
        options?: DistinctOptions
    ): Promise<Flatten<ResolvePath<Type, Key>>[]> {
        const fixedKey = (key as string).replaceAll(`.${DEFAULT_ARRAY_PLACEHOLDER}`, "");
        return this.collection.distinct(fixedKey, filter ?? {}, options ?? {}) as Promise<
            Flatten<ResolvePath<Type, Key>>[]
        >;
    }

    /************************/
    /************************/
    /***     INDEXES      ***/
    /************************/
    /************************/
    /**
     * Lists the indexes in the collection.
     *
     * @param {ListIndexesOptions} options - Optional settings for the listIndexes operation. Learn more at
     *                                       {@link https://mongodb.github.io/node-mongodb-native/6.7/types/ListIndexesOptions.html this}.
     *
     * @returns {Promise<ListIndexesCursor>} A promise that resolves to a cursor for the list of indexes.
     *
     * @example
     * // List all indexes in the user collection.
     * const indexes = await UserModel.listIndexes();
     * for await (const index of indexes) {
     *  console.log(index);
     * }
     */
    public listIndexes(options?: ListIndexesOptions): ListIndexesCursor {
        return this.collection.listIndexes(options);
    }

    /**
     * Creates one or more indexes in the collection.
     *
     * **Note:** Wildcard index suggestions `$**` will be available in the key paths. Learn more at
     *           {@link https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/ this}.
     *
     * @param {MGIndexDescription[]} indexes - An array of index specifications to create in the collection.
     * @param {MGCreateIndexesOptions<Type>} options - Optional settings for the createIndexes operation. Learn more at
     *                                                 {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/CreateIndexesOptions.html this}.
     *
     * @returns {Promise<string[]>} A promise that resolves to an array of index names that were created.
     *
     * @example
     * // Create a unique index on the email field in the user collection.
     * const indexNames = await UserModel.createIndexes([{ key: { email: 1 }, unique: true }]);
     */
    public createIndexes(
        indexes: MGIndexDescription<Type>[],
        options?: MGCreateIndexesOptions<Type>
    ): Promise<string[]> {
        return this.collection.createIndexes(removeUndefinedFields(indexes) as IndexDescription[], options);
    }

    /**
     * Creates a single index in the collection.
     *
     * **Note:** Wildcard index suggestions `$**` will be available in the key paths. Learn more at
     *           {@link https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/ this}.
     *
     * @param {MGIndexSpecification} index - The index specification to create in the collection.
     * @param {MGCreateIndexesOptions<Type>} options - Optional settings for the createIndex operation. Learn more at
     *                                                 {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/CreateIndexesOptions.html this}.
     *
     * @returns {Promise<string>} A promise that resolves to the name of the index that was created.
     *
     * @example
     * // Create a unique index on the email field in the user collection.
     * const indexName = await UserModel.createIndex({ key: { email: 1 }, unique: true });
     */
    public createIndex(index: MGIndexSpecification<Type>, options?: MGCreateIndexesOptions<Type>): Promise<string> {
        return this.collection.createIndex(removeUndefinedFields(index) as IndexSpecification, options);
    }

    /**
     * Drops an index from the collection.
     *
     * @param {string} indexName - The name of the index to drop.
     * @param {DropIndexesOptions} options - Optional settings for the dropIndexes operation. Learn more at
     *                                       {@link https://mongodb.github.io/node-mongodb-native/6.7/types/DropIndexesOptions.html this}.
     *
     * @returns {Promise<BSON.Document>} A promise that resolves to the result of the dropIndexes operation.
     *
     * @example
     * // Drop the unique index on the email field in the user collection.
     * const result = await UserModel.dropIndex("email_1");
     */
    public dropIndex(indexName: string, options?: DropIndexesOptions): Promise<BSON.Document> {
        return this.collection.dropIndex(indexName, options);
    }

    /**
     * Drops all indexes from the collection.
     *
     * @param {DropIndexesOptions} options - Optional settings for the dropIndexes operation. Learn more at
     *                                       {@link https://mongodb.github.io/node-mongodb-native/6.7/types/DropIndexesOptions.html this}.
     *
     * @returns {Promise<boolean>} A promise that resolves to the result of the dropIndexes operation.
     *
     * @example
     * // Drop all indexes from the user collection.
     * const result = await UserModel.dropIndexes();
     */
    public dropIndexes(options?: DropIndexesOptions): Promise<boolean> {
        return this.collection.dropIndexes(options);
    }

    /**
     * Lists the search indexes in the collection.
     *
     * @param {string} name - The name of the index to search for.
     * @param {ListSearchIndexesOptions} options - Optional settings for the listSearchIndexes operation. Learn more at
     *                                             {@link https://mongodb.github.io/node-mongodb-native/6.7/types/ListSearchIndexesOptions.html this}.
     *
     * @returns {ListSearchIndexesCursor} A cursor for the list of search indexes.
     *
     * @example
     * // List all search indexes in the user collection.
     * const indexes = UserModel.listSearchIndexes();
     * for await (const index of indexes) {
     *  console.log(index);
     * }
     */
    public listSearchIndexes(options?: ListSearchIndexesOptions): ListSearchIndexesCursor;
    public listSearchIndexes(name: string, options?: ListSearchIndexesOptions): ListSearchIndexesCursor;
    public listSearchIndexes(
        nameOrOptions?: string | ListSearchIndexesOptions,
        options?: ListSearchIndexesOptions
    ): ListSearchIndexesCursor {
        if (typeof nameOrOptions === "string") return this.collection.listSearchIndexes(nameOrOptions, options);
        else if (typeof nameOrOptions === "object") return this.collection.listSearchIndexes(nameOrOptions);

        return this.collection.listSearchIndexes(options);
    }

    /**
     * Creates a search index in the collection.
     *
     * @param {SearchIndexDescription} description - The description of the search index to create. Learn more at
     *                                               {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/SearchIndexDescription.html this}.
     *
     * @returns {Promise<string>} A promise that resolves to the name of the search index that was created.
     */
    public createSearchIndex(description: SearchIndexDescription): Promise<string> {
        return this.collection.createSearchIndex(description);
    }

    /**
     * Creates multiple search indexes in the collection.
     *
     * @param {SearchIndexDescription[]} descriptions - An array of search index descriptions to create in the collection. Learn more at
     *                                                  {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/SearchIndexDescription.html this}.
     *
     * @returns {Promise<string[]>} A promise that resolves to an array of search index names that were created.
     */
    public createSearchIndexes(descriptions: SearchIndexDescription[]): Promise<string[]> {
        return this.collection.createSearchIndexes(descriptions);
    }

    /**
     * Updates a search index in the collection.
     *
     * @param {string} name - The name of the search index to update.
     * @param {BSON.Document} definition - The updated definition of the search index.
     *
     * @returns {Promise<void>} A promise that resolves when the search index is updated.
     */
    public updateSearchIndex(name: string, definition: BSON.Document): Promise<void> {
        return this.collection.updateSearchIndex(name, definition);
    }

    /**
     * Drops a search index from the collection.
     *
     * @param {string} name - The name of the search index to drop.
     *
     * @returns {Promise<void>} A promise that resolves when the search index is dropped.
     */
    public dropSearchIndex(name: string): Promise<void> {
        return this.collection.dropSearchIndex(name);
    }

    /************************/
    /************************/
    /***       CRUD       ***/
    /************************/
    /************************/
    /**
     * Create aggregation cursor for the collection.
     *
     * @param {BSON.Document[]} pipeline - An array of aggregation pipeline stages to execute.
     * @param {AggregateOptions} option - Optional settings for the `aggregate` operation. Learn more at
     *                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/AggregateOptions.html this}.
     *
     * @returns {AggregationCursor<Type>} A cursor for the aggregation result.
     * @todo Implement pipeline builder + type-safe stages.
     */
    public aggregate(pipeline: BSON.Document[], option?: AggregateOptions): AggregationCursor<Type> {
        return this.collection.aggregate(pipeline, option);
    }

    /**
     * Performs bulk write operations on the collection. Returns a promise that resolves with the bulk write result
     * and an array of validation errors that occurred during the process.
     *
     * **Note:** By default, this operation validates the documents before writing them to the collection.
     * If you want to bypass document validation, set the `bypassDocumentValidation` option to `true`.
     *
     * **IMPORTANT:** This is not yet support dot-notation paths for update operations.
     *
     * @param {AnyBulkWriteOperation<Type>[]} operations - An array of bulk write operations to perform.
     * @param {BulkWriteOptions} options - Optional settings for the `bulkWrite` operation. Learn more at
     *                                     {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/BulkWriteOptions.html this}.
     *
     * @returns {Promise<BulkWriteResultMap>} A promise that resolves to the result of the bulk write operation.
     */
    public async bulkWrite(
        operations: AnyBulkWriteOperation<Type>[],
        options?: BulkWriteOptions
    ): Promise<BulkWriteResultMap> {
        const skipValidate = options?.bypassDocumentValidation ?? false;
        const errMap: BulkWriteErrorMap = [];

        if (!skipValidate) {
            for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];
                try {
                    if ("insertOne" in operation) {
                        const doc = operation.insertOne.document;
                        await this.parse(doc);
                    } else if ("updateOne" in operation) {
                        const doc = operation.updateOne.update;
                        if (doc.hasOwnProperty("_id")) throw new IdFieldNotAllowedError();
                        if (Array.isArray(doc)) continue;
                        if ("$set" in doc && doc.$set) await this.parse(doc.$set, { isPartial: true });
                    } else if ("updateMany" in operation) {
                        const doc = operation.updateMany.update;
                        if (doc.hasOwnProperty("_id")) throw new IdFieldNotAllowedError();
                        if ("$set" in doc && doc.$set) await this.parse(doc.$set, { isPartial: true });
                    } else if ("replaceOne" in operation) {
                        const doc = operation.replaceOne.replacement;
                        if (doc.hasOwnProperty("_id")) throw new IdFieldNotAllowedError();
                        await this.parse(doc, { partialFields: ["_id"] as ObjectKeyPaths<Type>[] });
                    }
                } catch (err) {
                    if (err instanceof IdFieldNotAllowedError || err instanceof ValidateError)
                        errMap.push({ index: i, error: err });
                    else throw err;
                }
            }
        }

        return this.collection.bulkWrite(operations, options).then((res) => ({ result: res, validateErrors: errMap }));
    }

    /**
     * Finds documents in the collection that match the specified filter criteria.
     *
     * @param {Filter<Type>} filter - Optional filter criteria to apply to the find operation.
     * @param {FindOptions} options - Optional settings for the `find` operation. Learn more at
     *                                {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html this}.
     *
     * @returns {Promise<Type[]>} A promise that resolves to an array of documents matching the criteria.
     *
     * @example
     * // Find all user documents in the collection.
     * const users = await UserModel.find();
     */
    public async find(filter?: Filter<Type>, options?: FindOptions): Promise<Type[]> {
        return this._find("find", filter, options) as Promise<Type[]>;
    }

    /**
     * Finds a document in the collection by its ID.
     *
     * @param {IdField<Type>} id - The ID of the document to find.
     * @param {FindOptions} options - Optional settings for the `findById` operation. Learn more at
     *                                {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html this}.
     *
     * @returns {Promise<Type | null>} A promise that resolves to the document matching the ID.
     *                                 If no document is found, the promise resolves to null.
     *
     * @example
     * // Find a user document with the specified ID.
     * const user = await UserModel.findById(new ObjectId("64b175497dc71570edd625d2"));
     */
    public async findById(id: IdField<Type>, options?: FindOptions): Promise<Type | null> {
        return this.findOne({ _id: id }, options);
    }

    /**
     * Finds a document in the collection by its ID and updates it.
     *
     * **Note:** By default, this operation uses the `$set` operator. If you assign `undefined` to a field,
     * it will be removed from the document (using the `unset` operator) rather than being set to `null` (as MongoDB's default behavior).
     *
     * @param {IdField<Type>} id - The ID of the document to find and update.
     * @param {UpdateType<Type>} update - The update to apply to the document.
     * @param {FindOneAndUpdateOptions} options - Optional settings for the `findByIdAndUpdate` operation. Learn more at
     *                                            {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndUpdateOptions.html this}.
     *
     * @returns {Promise<ModifyResult<Type> | Type | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Update a user document with the specified ID and return the original document (before updated).
     * const updatedUser = await UserModel.findByIdAndUpdate("64b175497dc71570edd625d2", { name: "John Doe" });
     */
    public async findByIdAndUpdate(
        id: IdField<Type>,
        update: UpdateType<Type>,
        options: FindOneAndUpdateOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<Type>>;
    public async findByIdAndUpdate(
        id: IdField<Type>,
        update: UpdateType<Type>,
        options: FindOneAndUpdateOptions & { includeResultMetadata: false }
    ): Promise<Type | null>;
    public async findByIdAndUpdate(
        id: IdField<Type>,
        update: UpdateType<Type>,
        options: FindOneAndUpdateOptions
    ): Promise<Type | null>;
    public async findByIdAndUpdate(id: IdField<Type>, update: UpdateType<Type>): Promise<Type | null>;
    public async findByIdAndUpdate(
        id: IdField<Type>,
        update: UpdateType<Type>,
        options?: FindOneAndUpdateOptions
    ): Promise<ModifyResult<Type> | Type | null> {
        if (!options) return this.findOneAndUpdate({ _id: id }, update);
        else return this.findOneAndUpdate({ _id: id }, update, options);
    }

    /**
     * Finds a document in the collection by its ID and replaces it.
     *
     * @param {IdField<Type>} id - The ID of the document to find and replace.
     * @param {OmitId<Type>} replacement - The replacement document.
     * @param {FindOneAndReplaceOptions} options - Optional settings for the `findByIdAndReplace` operation. Learn more at
     *                                             {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndReplaceOptions.html this}.
     *
     * @returns {Promise<ModifyResult<Type> | Type | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Replace a user document with a new one and return the original document (before replaced).
     * const replacedUser = await UserModel.findByIdAndReplace("64b175497dc71570edd625d2", { name: "John Doe" });
     */
    public async findByIdAndReplace(
        id: IdField<Type>,
        replacement: OmitId<Type>,
        options: FindOneAndReplaceOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<Type>>;
    public async findByIdAndReplace(
        id: IdField<Type>,
        replacement: OmitId<Type>,
        options: FindOneAndReplaceOptions & { includeResultMetadata: false }
    ): Promise<Type | null>;
    public async findByIdAndReplace(
        id: IdField<Type>,
        replacement: OmitId<Type>,
        options: FindOneAndReplaceOptions
    ): Promise<Type | null>;
    public async findByIdAndReplace(id: IdField<Type>, replacement: OmitId<Type>): Promise<Type | null>;
    public async findByIdAndReplace(
        id: IdField<Type>,
        replacement: OmitId<Type>,
        options?: FindOneAndReplaceOptions
    ): Promise<ModifyResult<Type> | Type | null> {
        if (!options) return this.findOneAndReplace({ _id: id }, replacement);
        else return this.findOneAndReplace({ _id: id }, replacement, options);
    }

    /**
     * Finds a document in the collection by its ID and deletes it.
     *
     * @param {IdField<Type>} id - The ID of the document to find and delete.
     * @param {FindOneAndDeleteOptions} options - Optional settings for the `findByIdAndDelete` operation. Learn more at
     *                                            {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndDeleteOptions.html this}.
     *
     * @returns {Promise<ModifyResult<Type> | Type | null>} A promise that resolves to the deleted document or `null` if no document is found.
     *
     * @example
     * // Delete a user document with the specified ID and return the deleted document.
     * const deletedUser = await UserModel.findByIdAndDelete("64b175497dc71570edd625d2");
     */
    public async findByIdAndDelete(
        id: IdField<Type>,
        options: FindOneAndDeleteOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<Type>>;
    public async findByIdAndDelete(
        id: IdField<Type>,
        options: FindOneAndDeleteOptions & { includeResultMetadata: false }
    ): Promise<Type | null>;
    public async findByIdAndDelete(id: IdField<Type>, options: FindOneAndDeleteOptions): Promise<Type | null>;
    public async findByIdAndDelete(id: IdField<Type>): Promise<Type | null>;
    public async findByIdAndDelete(
        id: IdField<Type>,
        options?: FindOneAndDeleteOptions
    ): Promise<ModifyResult<Type> | Type | null> {
        if (!options) return this.findOneAndDelete({ _id: id });
        else return this.findOneAndDelete({ _id: id }, options);
    }

    /**
     * Finds a document in the collection that match the specified filter criteria.
     *
     * @param {Filter<Type>} [filter] - Optional filter criteria to apply to the find operation.
     * @param {FindOptions} options - Optional settings for the `findOne` operation. Learn more at
     *                                {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html this}.
     *
     * @returns {Promise<Type | null>} A promise that resolves to the first document matching the criteria.
     *
     * @example
     * // Find a user document with the specified name.
     * const user = await UserModel.findOne({ name: "John Doe" });
     */
    public async findOne(filter?: Filter<Type>, options?: FindOptions): Promise<Type | null> {
        return this._find("findOne", filter, options) as Promise<Type | null>;
    }

    /**
     * Finds a document in the collection that match the specified filter criteria and updates it.
     *
     * **Note:** By default, this operation uses the `$set` operator. If you assign `undefined` to a field,
     * it will be removed from the document (using the `unset` operator) rather than being set to `null` (as MongoDB's default behavior).
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the document to update.
     * @param {UpdateType<Type>} update - The update operations to be applied to the document.
     * @param {FindOneAndUpdateOptions} options - Options for the `findOneAndUpdate` operation. Learn more at
     *                                            {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndUpdateOptions.html this}.
     *
     * @returns {Promise<ModifyResult<Type> | Type | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Update a user's age and return the original document (before updated).
     * const user = await UserModel.findOneAndUpdate({ name: "John Doe" }, { age: 30 });
     */
    public async findOneAndUpdate(
        filter: Filter<Type>,
        update: UpdateType<Type>,
        options: FindOneAndUpdateOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<Type>>;
    public async findOneAndUpdate(
        filter: Filter<Type>,
        update: UpdateType<Type>,
        options: FindOneAndUpdateOptions & { includeResultMetadata: false }
    ): Promise<Type | null>;
    public async findOneAndUpdate(
        filter: Filter<Type>,
        update: UpdateType<Type>,
        options: FindOneAndUpdateOptions
    ): Promise<Type | null>;
    public async findOneAndUpdate(filter: Filter<Type>, update: UpdateType<Type>): Promise<Type | null>;
    public async findOneAndUpdate(
        filter: Filter<Type>,
        update: UpdateType<Type>,
        options?: FindOneAndUpdateOptions
    ): Promise<ModifyResult<Type> | Type | null> {
        if (update.hasOwnProperty("_id")) throw new IdFieldNotAllowedError();
        await this.parse(update, { isPartial: true });

        const { set, unset } = processUndefinedFieldsForUpdate(update);
        const updateFilter = { $set: set as Partial<Type>, $unset: unset } as UpdateFilter<Type>;

        let res;
        if (options) {
            if (options.includeResultMetadata)
                return this.collection.findOneAndUpdate(
                    filter,
                    updateFilter,
                    options as FindOneAndUpdateOptions & { includeResultMetadata: true }
                );

            res = this.collection.findOneAndUpdate(filter, updateFilter, options);
        } else res = this.collection.findOneAndUpdate(filter, updateFilter);

        return res.then(async (doc) => (doc ? (doc as Type) : null));
    }

    /**
     * Finds a document in the collection that match the specified filter criteria and replaces it.
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the document to update.
     * @param {OmitId<Type>} replacement - The replacement document.
     * @param {FindOneAndReplaceOptions} options - Optional settings for the `findOneAndReplace` operation. Learn more at
     *                                             {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndReplaceOptions.html this}.
     *
     * @returns {Promise<ModifyResult<Type> | Type | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Replace a user document with a new one and return the original document (before replaced).
     * const replacedUser = await UserModel.findOneAndReplace({ name: "John Doe" }, { name: "Jane Doe" });
     */
    public async findOneAndReplace(
        filter: Filter<Type>,
        replacement: OmitId<Type>,
        options: FindOneAndReplaceOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<Type>>;
    public async findOneAndReplace(
        filter: Filter<Type>,
        replacement: OmitId<Type>,
        options: FindOneAndReplaceOptions & { includeResultMetadata: false }
    ): Promise<Type | null>;
    public async findOneAndReplace(
        filter: Filter<Type>,
        replacement: OmitId<Type>,
        options: FindOneAndReplaceOptions
    ): Promise<Type | null>;
    public async findOneAndReplace(filter: Filter<Type>, replacement: OmitId<Type>): Promise<Type | null>;
    public async findOneAndReplace(
        filter: Filter<Type>,
        replacement: OmitId<Type>,
        options?: FindOneAndReplaceOptions
    ): Promise<ModifyResult<Type> | Type | null> {
        if (replacement.hasOwnProperty("_id")) throw new IdFieldNotAllowedError();
        replacement = removeUndefinedFields(
            await this.parse(
                replacement,
                this.schema.shape.hasOwnProperty("_id")
                    ? { partialFields: ["_id"] as ObjectKeyPaths<Type>[] }
                    : undefined
            )
        ) as OmitId<Type>;

        let res;
        if (options) {
            if (options.includeResultMetadata)
                return this.collection.findOneAndReplace(
                    filter,
                    replacement,
                    options as FindOneAndUpdateOptions & { includeResultMetadata: true }
                );

            res = this.collection.findOneAndReplace(filter, replacement, options);
        } else res = this.collection.findOneAndReplace(filter, replacement);

        return res.then((doc) => (doc ? (doc as Type) : null));
    }

    /**
     * Finds a document in the collection that match the specified filter criteria and deletes it.
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the document to delete.
     * @param {FindOneAndDeleteOptions} options - Options for the `findOneAndDelete` operation. Learn more at
     *                                            {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndDeleteOptions.html this}.
     *
     * @returns {Promise<ModifyResult<Type> | Type | null>} A promise that resolves to the deleted document or `null` if no document is found.
     *
     * @example
     * // Delete a user's document with the specified name and return the deleted document.
     * const user = await UserModel.findOneAndDelete({ name: "John Doe" });
     */
    public async findOneAndDelete(
        filter: Filter<Type>,
        options: FindOneAndDeleteOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<Type>>;
    public async findOneAndDelete(
        filter: Filter<Type>,
        options: FindOneAndDeleteOptions & { includeResultMetadata: false }
    ): Promise<Type | null>;
    public async findOneAndDelete(filter: Filter<Type>, options: FindOneAndDeleteOptions): Promise<Type | null>;
    public async findOneAndDelete(filter: Filter<Type>): Promise<Type | null>;
    public async findOneAndDelete(
        filter: Filter<Type>,
        options?: FindOneAndDeleteOptions
    ): Promise<ModifyResult<Type> | Type | null> {
        let res;
        if (options) {
            if (options.includeResultMetadata)
                return this.collection.findOneAndDelete(
                    filter,
                    options as FindOneAndDeleteOptions & { includeResultMetadata: true }
                );

            res = this.collection.findOneAndDelete(filter, options);
        } else res = this.collection.findOneAndDelete(filter);

        return res.then((doc) => (doc ? (doc as Type) : null));
    }

    private async _find(
        method: "find" | "findOne",
        filter: Filter<Type> = {},
        options?: FindOptions
    ): Promise<Type[] | Type | null> {
        const isCheckOnGet = this.checkOnGet;

        if (method === "find") {
            const docs = await this.collection.find(filter, options).toArray();
            return (isCheckOnGet ? await Promise.all(docs.map((doc) => this.parse(doc))) : docs) as Type[];
        } else {
            const doc = await this.collection.findOne(filter, options);
            return (isCheckOnGet && doc ? await this.parse(doc) : doc) as Type | null;
        }
    }

    /**
     * Inserts a single document into the collection.
     *
     * @param {Type} data - The document to insert into the collection.
     * @param {InsertOneOptions} options - Optional settings for the insert operation. Learn more at
     *                                     {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/InsertOneOptions.html this}.
     *
     * @returns {Promise<InsertOneResult>} A promise that resolves to the result of the insert operation.
     *
     * @example
     * // Insert a new user document into the collection.
     * const result = await UserModel.insertOne({ name: "John Doe", age: 30 });
     */
    public async insertOne(data: Type, options?: InsertOneOptions): Promise<InsertOneResult> {
        return this._insert(data, options) as Promise<InsertOneResult>;
    }

    /**
     * Inserts multiple documents into the collection.
     *
     * @param {Type[]} data - An array of documents to insert into the collection.
     * @param {BulkWriteOptions} options - Optional settings for the bulk write operation. Learn more at
     *                                     {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/BulkWriteOptions.html this}.
     *
     * @returns {Promise<InsertManyResult>} A promise that resolves to the result of the insert operation.
     *
     * @example
     * // Insert multiple user documents into the collection.
     * const result = await UserModel.insertMany([
     *   { name: "John Doe", age: 30 },
     *   { name: "Jane Doe", age: 25 }
     * ]);
     */
    public async insertMany(data: Type[], options?: BulkWriteOptions): Promise<InsertManyResult> {
        return this._insert(data, options) as Promise<InsertManyResult>;
    }

    private async _insert(
        data: Type | Type[],
        options?: InsertOneOptions | BulkWriteOptions
    ): Promise<InsertOneResult | InsertManyResult> {
        if (Array.isArray(data)) {
            data = await Promise.all(data.map(async (doc) => removeUndefinedFields(await this.parse(doc)) as Type));

            return this.collection.insertMany(data as OptionalUnlessRequiredId<Type>[], options as BulkWriteOptions);
        } else {
            data = removeUndefinedFields(await this.parse(data)) as Type;
            return this.collection.insertOne(data as OptionalUnlessRequiredId<Type>, options as InsertOneOptions);
        }
    }

    /**
     * Updates a single document in the collection that matches the given filter criteria.
     *
     * **Note:** By default, this operation uses the `$set` operator. If you assign `undefined` to a field,
     * it will be removed from the document (using the `unset` operator) rather than being set to `null` (as MongoDB's default behavior).
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the document to update.
     * @param {UpdateType<Type>} update - The update operations to be applied to the document.
     * @param {UpdateOptions} options - Optional settings for the update operation. Learn more at
     *                                  {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/UpdateOptions.html this}.
     *
     * @returns {Promise<UpdateResult>} A promise that resolves to the result of the update operation.
     *
     * @example
     * // Update a user's age in the collection.
     * const result = await UserModel.updateOne({ name: "John Doe" }, { age: 31 });
     */
    public async updateOne(
        filter: Filter<Type>,
        update: UpdateType<Type>,
        options?: UpdateOptions
    ): Promise<UpdateResult> {
        return this._update("updateOne", filter, update, options);
    }

    /**
     * Updates multiple documents in the collection that match the given filter criteria.
     *
     * **Note:** By default, this operation uses the `$set` operator. If you assign `undefined` to a field,
     * it will be removed from the document (using the `unset` operator) rather than being set to `null` (as MongoDB's default behavior).
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the documents to update.
     * @param {UpdateType<Type>} update - The update operations to be applied to the documents.
     * @param {UpdateOptions} options - Optional settings for the update operation. Learn more at
     *                                  {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/UpdateOptions.html this}.
     *
     * @returns {Promise<UpdateResult>} A promise that resolves to the result of the update operation.
     *
     * @example
     * // Update the age of multiple users in the collection.
     * const result = await UserModel.updateMany({ age: { $lt: 30 } }, { age: 30 });
     */
    public async updateMany(
        filter: Filter<Type>,
        update: UpdateType<Type>,
        options?: UpdateOptions
    ): Promise<UpdateResult> {
        return this._update("updateMany", filter, update, options);
    }

    private async _update(
        method: "updateOne" | "updateMany",
        filter: Filter<Type>,
        update: UpdateType<Type>,
        options?: UpdateOptions
    ): Promise<UpdateResult> {
        if (update.hasOwnProperty("_id")) throw new IdFieldNotAllowedError();
        await this.parse(update, { isPartial: true });

        const { set, unset } = processUndefinedFieldsForUpdate(update);

        return this.collection[method](
            filter,
            { $set: set as Partial<Type>, $unset: unset } as UpdateFilter<Type>,
            options
        );
    }

    /**
     * Replaces a single document in the collection that matches the given filter criteria.
     * The entire document is replaced with the provided replacement document.
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the document to replace.
     * @param {OmitId<Type>} replacement - The replacement document that will replace the existing document.
     * @param {ReplaceOptions} options - Optional settings for the replace operation. Learn more at
     *                                   {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/ReplaceOptions.html this}.
     *
     * @returns {Promise<UpdateResult>} A promise that resolves to the result of the replace operation.
     *
     * @example
     * // Replace a user's document in the collection.
     * const result = await UserModel.replaceOne({ name: "John Doe" }, { name: "John Doe", age: 31 });
     */
    public async replaceOne(
        filter: Filter<Type>,
        replacement: OmitId<Type>,
        options?: ReplaceOptions
    ): Promise<UpdateResult> {
        if (replacement.hasOwnProperty("_id")) throw new IdFieldNotAllowedError();
        replacement = removeUndefinedFields(
            await this.parse(
                replacement,
                this.schema.shape.hasOwnProperty("_id")
                    ? { partialFields: ["_id"] as ObjectKeyPaths<Type>[] }
                    : undefined
            )
        ) as OmitId<Type>;

        return this.collection.replaceOne(filter, replacement, options) as Promise<UpdateResult>;
    }

    /**
     * Deletes a single document in the collection that matches the given filter criteria.
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the document to delete.
     * @param {DeleteOptions} options - Optional settings for the delete operation. Learn more at
     *                                  {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/DeleteOptions.html this}.
     *
     * @returns {Promise<DeleteResult>} A promise that resolves to the result of the delete operation.
     *
     * @example
     * // Delete a user document from the collection.
     * const result = await UserModel.deleteOne({ name: "John Doe" });
     */
    public async deleteOne(filter: Filter<Type>, options?: DeleteOptions): Promise<DeleteResult> {
        return this._delete("deleteOne", filter, options);
    }

    /**
     * Deletes multiple documents in the collection that match the given filter criteria.
     *
     * @param {Filter<Type>} filter - The filter criteria to locate the documents to delete.
     * @param {DeleteOptions} options - Optional settings for the delete operation. Learn more at
     *                                  {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/DeleteOptions.html this}.
     *
     * @returns {Promise<DeleteResult>} A promise that resolves to the result of the delete operation.
     *
     * @example
     * // Delete multiple user documents from the collection.
     * const result = await UserModel.deleteMany({ age: { $lt: 30 } });
     */
    public async deleteMany(filter: Filter<Type>, options?: DeleteOptions): Promise<DeleteResult> {
        return this._delete("deleteMany", filter, options);
    }

    private async _delete(
        method: "deleteOne" | "deleteMany",
        filter: Filter<Type>,
        options?: DeleteOptions
    ): Promise<DeleteResult> {
        return this.collection[method](filter, options);
    }
}

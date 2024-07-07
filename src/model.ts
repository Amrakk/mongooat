import { ZodObject, ZodRawShape } from "zod";
import ValidateError from "./error/validate.js";
import mongo, { BSON, Filter, ModifyResult, ObjectId } from "mongodb";
import { DefaultModelOptions, ModelOptions } from "./options/modelOptions.js";

import DBNotSetError from "./error/dbNotSet.js";

/**
 * Represents a model that maps to a MongoDB collection and defines the structure of documents within that collection
 * using a Zod schema for validation. This class provides a foundation for creating, reading, updating, and deleting
 * documents in a type-safe manner.
 *
 * @template ModelType - The TypeScript type that represents the shape of documents in the MongoDB collection.
 * @template SchemaType - The shape of the schema used for validation, defined using Zod.
 */
export class Model<ModelType extends BSON.Document, SchemaType extends ZodRawShape> {
    private _name: string;
    private _schema: ZodObject<SchemaType>;
    private _options: ModelOptions<SchemaType>;

    readonly _type: ModelType = {} as ModelType;

    constructor(name: string, schema: ZodObject<SchemaType>, options?: Partial<ModelOptions<SchemaType>>) {
        this._name = name;
        this._schema = schema;

        options = options ?? {};
        options.collection = options.collection ?? name;
        this._options = { ...DefaultModelOptions, ...options };
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
    public get collection() {
        return this._options.collection;
    }

    /**
     * Parses the provided data object using the model's schema and returns the result as a document of the specified type.
     *
     * @param data - The data object to parse.
     * @param isPartial - A boolean value indicating whether to parse the data as a partial document.
     *
     * @returns The parsed document object.
     */
    public async parse(data: object): Promise<ModelType>;
    public async parse(data: object, isPartial: true): Promise<Partial<ModelType>>;
    public async parse(data: object, isPartial?: true): Promise<ModelType | Partial<ModelType>> {
        const schema = isPartial ? this.schema.partial() : this.schema;
        const test = await schema.safeParseAsync(data);

        if (!test.success) throw new ValidateError(this.name, test.error.errors);
        return data as ModelType;
    }

    /**
     * Attempts to parse the provided data object using the model's schema and returns a boolean value indicating
     * whether the parsing was successful.
     *
     * @param data - The data object to parse.
     * @param isPartial - A boolean value indicating whether to parse the data as a partial document.
     *
     * @returns A boolean value indicating whether the parsing was successful.
     */
    public async tryParse(data: object, isPartial?: true): Promise<boolean> {
        const schema = isPartial ? this.schema.partial() : this.schema;
        return schema.safeParseAsync(data).then((res) => res.success);
    }

    /**
     * Hides the specified fields from the provided data object or array of objects.
     *
     * @param data - The data object or array of objects from which to hide fields.
     * @param hiddenFields - An optional array of field names to hide from the data object(s).
     *
     * @returns The data object or array of objects with the specified fields hidden.
     */
    // TODO: implements hide inner fields (nested fields)
    public hideFields(data: ModelType, hiddenFields?: (keyof SchemaType)[]): ModelType;
    public hideFields(data: ModelType[], hiddenFields?: (keyof SchemaType)[]): ModelType[];
    public hideFields(data: ModelType | ModelType[], hiddenFields?: (keyof SchemaType)[]): ModelType | ModelType[] {
        hiddenFields = hiddenFields ?? this._options.hiddenFields;
        if (hiddenFields.length === 0) return data;

        for (const field of hiddenFields) {
            if (Array.isArray(data)) {
                for (const item of data) delete item[field as string];
                continue;
            }
            delete data[field as string];
        }

        return data;
    }
}

/**
 * Represents a MongoDB database model that provides methods for interacting with a MongoDB database.
 * This class provides methods for querying, inserting, updating, and deleting documents in a type-safe manner.
 */
export class MGModel {
    private _currDb?: mongo.Db;

    constructor(currDb?: mongo.Db) {
        this._currDb = currDb;
    }

    /** A setter for the current database context. */
    public set currDb(db: mongo.Db) {
        this._currDb = db;
    }

    /**
     * Finds documents in the collection associated with the specified model that match the specified filter criteria.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to query.
     * @param {Filter<MT>} [filter] - Optional filter criteria to apply to the find operation.
     * @param {mongo.FindOptions} [options] - Optional settings for the find operation. Learn more at
     *                                        {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html}.
     *
     * @returns {Promise<MT[]>} A promise that resolves to an array of documents matching the criteria.
     *
     * @example
     * // Find all user documents in the collection.
     * const users = await mongooat.model.find(UserModel);
     */
    public async find<MT extends BSON.Document, ST extends ZodRawShape>(model: Model<MT, ST>): Promise<MT[]>;
    public async find<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options?: mongo.FindOptions
    ): Promise<MT[]>;
    public async find<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter?: Filter<MT>,
        options?: mongo.FindOptions
    ): Promise<MT[]> {
        return this._find("find", model, filter, options) as Promise<MT[]>;
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find.
     * @param {mongo.FindOptions} [options] - Optional settings for the find operation. Learn more at
     *                                        {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html}.
     *
     * @returns {Promise<MT | null>} A promise that resolves to the document matching the ID.
     *                               If no document is found, the promise resolves to null.
     *
     * @example
     * // Find a user document with the specified ID.
     * const user = await mongooat.model.findById(UserModel, new ObjectId("64b175497dc71570edd625d2"));
     */
    public async findById<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        options?: mongo.FindOptions
    ): Promise<MT | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<MT>;
        return this.findOne(model, _id, options);
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID and updates it.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find and update.
     * @param {Partial<MT>} update - The update to apply to the document.
     * @param {mongo.FindOneAndUpdateOptions} [options] - Optional settings for the find and update operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndUpdateOptions.html}.
     *
     * @returns {Promise<ModifyResult<MT> | MT | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Update a user document with the specified ID and return the original document (before updated).
     * const updatedUser = await mongooat.model.findByIdAndUpdate(UserModel, "64b175497dc71570edd625d2", { name: "John Doe" });
     */
    public async findByIdAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        update: Partial<MT>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<MT>>;
    public async findByIdAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        update: Partial<MT>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: false }
    ): Promise<MT | null>;
    public async findByIdAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        update: Partial<MT>,
        options: mongo.FindOneAndUpdateOptions
    ): Promise<MT | null>;
    public async findByIdAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        update: Partial<MT>
    ): Promise<MT | null>;
    public async findByIdAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        update: Partial<MT>,
        options?: mongo.FindOneAndUpdateOptions
    ): Promise<ModifyResult<MT> | MT | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<MT>;
        if (!options) return this.findOneAndUpdate(model, _id, update);
        else return this.findOneAndUpdate(model, _id, update, options);
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID and replaces it.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find and replace.
     * @param {MT} replacement - The replacement document.
     * @param {mongo.FindOneAndReplaceOptions} [options] - Optional settings for the find and replace operation. Learn more at
     *                                                     {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndReplaceOptions.html}.
     *
     * @returns {Promise<ModifyResult<MT> | MT | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Replace a user document with a new one and return the original document (before replaced).
     * const replacedUser = await mongooat.model.findByIdAndReplace(UserModel, "64b175497dc71570edd625d2", { name: "John Doe" });
     */
    public async findByIdAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        replacement: MT,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<MT>>;
    public async findByIdAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        replacement: MT,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: false }
    ): Promise<MT | null>;
    public async findByIdAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        replacement: MT,
        options: mongo.FindOneAndReplaceOptions
    ): Promise<MT | null>;
    public async findByIdAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        replacement: MT
    ): Promise<MT | null>;
    public async findByIdAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        replacement: MT,
        options?: mongo.FindOneAndReplaceOptions
    ): Promise<ModifyResult<MT> | MT | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<MT>;
        if (!options) return this.findOneAndReplace(model, _id, replacement);
        else return this.findOneAndReplace(model, _id, replacement, options);
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID and deletes it.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find and delete.
     * @param {mongo.FindOneAndDeleteOptions} [options] - Optional settings for the find and delete operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndDeleteOptions.html}.
     *
     * @returns {Promise<ModifyResult<MT> | MT | null>} A promise that resolves to the deleted document or `null` if no document is found.
     *
     * @example
     * // Delete a user document with the specified ID and return the deleted document.
     * const deletedUser = await mongooat.model.findByIdAndDelete(UserModel, "64b175497dc71570edd625d2");
     */
    public async findByIdAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<MT>>;
    public async findByIdAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: false }
    ): Promise<MT | null>;
    public async findByIdAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        options: mongo.FindOneAndDeleteOptions
    ): Promise<MT | null>;
    public async findByIdAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId
    ): Promise<MT | null>;
    public async findByIdAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        id: string | ObjectId,
        options?: mongo.FindOneAndDeleteOptions
    ): Promise<ModifyResult<MT> | MT | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<MT>;
        if (!options) return this.findOneAndDelete(model, _id);
        else return this.findOneAndDelete(model, _id, options);
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to query.
     * @param {Filter<MT>} [filter] - Optional filter criteria to apply to the find operation.
     * @param {mongo.FindOptions} [options] - Optional settings for the find operation. Learn more at
     *                                        {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html}.
     *
     * @returns {Promise<MT | null>} A promise that resolves to the first document matching the criteria.
     *
     * @example
     * // Find a user document with the specified name.
     * const user = await mongooat.model.findOne(UserModel, { name: "John Doe" });
     */
    public async findOne<MT extends BSON.Document, ST extends ZodRawShape>(model: Model<MT, ST>): Promise<MT | null>;
    public async findOne<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options?: mongo.FindOptions
    ): Promise<MT | null>;
    public async findOne<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter?: Filter<MT>,
        options?: mongo.FindOptions
    ): Promise<MT | null> {
        return this._find("findOne", model, filter, options) as Promise<MT | null>;
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria and updates it.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to update.
     * @param {Filter<MT>} filter - The filter criteria to locate the document to update.
     * @param {Partial<MT>} update - The update operations to be applied to the document.
     * @param {mongo.FindOneAndUpdateOptions} [options] - Options for the `findOneAndUpdate` operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndUpdateOptions.html}.
     *
     * @returns {Promise<ModifyResult<MT> | MT | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Update a user's age and return the original document (before updated).
     * const user = await mongooat.model.findOneAndUpdate(UserModel, { name: "John Doe" }, { age: 30 });
     */
    public async findOneAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<MT>>;
    public async findOneAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: false }
    ): Promise<MT | null>;
    public async findOneAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>,
        options: mongo.FindOneAndUpdateOptions
    ): Promise<MT | null>;
    public async findOneAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>
    ): Promise<MT | null>;
    public async findOneAndUpdate<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>,
        options?: mongo.FindOneAndUpdateOptions
    ): Promise<ModifyResult<MT> | MT | null> {
        if (!this._currDb) throw new DBNotSetError();
        await model.parse(update, true);

        const collection = this._currDb.collection<MT>(model.collection);

        let res;
        if (options) {
            if (options.includeResultMetadata)
                return collection.findOneAndUpdate(
                    filter,
                    { $set: update },
                    options as mongo.FindOneAndUpdateOptions & { includeResultMetadata: true }
                );

            res = collection.findOneAndUpdate(filter, { $set: update }, options);
        } else res = collection.findOneAndUpdate(filter, { $set: update });

        return res.then((doc) => (doc ? (doc as MT) : null));
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria and replaces it.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to update.
     * @param {Filter<MT>} filter - The filter criteria to locate the document to update.
     * @param {Partial<MT>} update - The update operations to be applied to the document.
     * @param {mongo.FindOneAndReplaceOptions} [options] - Options for the `findOneAndReplace` operation. Learn more at
     *                                                     {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndReplaceOptions.html}.
     *
     * @returns {Promise<ModifyResult<MT> | MT | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Replace a user's document with a new one and return the original document (before replaced).
     * const user = await mongooat.model.findOneAndReplace(UserModel, { name: "John Doe" }, { name: "Jane Doe" });
     */
    public async findOneAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        replacement: MT,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<MT>>;
    public async findOneAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        replacement: MT,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: false }
    ): Promise<MT | null>;
    public async findOneAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        replacement: MT,
        options: mongo.FindOneAndReplaceOptions
    ): Promise<MT | null>;
    public async findOneAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        replacement: MT
    ): Promise<MT | null>;
    public async findOneAndReplace<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        replacement: MT,
        options?: mongo.FindOneAndReplaceOptions
    ): Promise<ModifyResult<MT> | MT | null> {
        if (!this._currDb) throw new DBNotSetError();
        await model.parse(replacement, true);

        const collection = this._currDb.collection<MT>(model.collection);

        let res;
        if (options) {
            if (options.includeResultMetadata)
                return collection.findOneAndReplace(
                    filter,
                    replacement,
                    options as mongo.FindOneAndUpdateOptions & { includeResultMetadata: true }
                );

            res = collection.findOneAndReplace(filter, replacement, options);
        } else res = collection.findOneAndReplace(filter, replacement);

        return res.then((doc) => (doc ? (doc as MT) : null));
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria and deletes it.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to update.
     * @param {Filter<MT>} filter - The filter criteria to locate the document to delete.
     * @param {mongo.FindOneAndDeleteOptions} [options] - Options for the `findOneAndDelete` operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndDeleteOptions.html}.
     *
     * @returns {Promise<ModifyResult<MT> | MT | null>} A promise that resolves to the deleted document or `null` if no document is found.
     *
     * @example
     * // Delete a user's document with the specified name and return the deleted document.
     * const user = await mongooat.model.findOneAndDelete(UserModel, { name: "John Doe" });
     */
    public async findOneAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<MT>>;
    public async findOneAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: false }
    ): Promise<MT | null>;
    public async findOneAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options: mongo.FindOneAndDeleteOptions
    ): Promise<MT | null>;
    public async findOneAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>
    ): Promise<MT | null>;
    public async findOneAndDelete<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options?: mongo.FindOneAndDeleteOptions
    ): Promise<ModifyResult<MT> | MT | null> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection<MT>(model.collection);

        let res;
        if (options) {
            if (options.includeResultMetadata)
                return collection.findOneAndDelete(
                    filter,
                    options as mongo.FindOneAndDeleteOptions & { includeResultMetadata: true }
                );

            res = collection.findOneAndDelete(filter, options);
        } else res = collection.findOneAndDelete(filter);

        return res.then((doc) => (doc ? (doc as MT) : null));
    }

    private async _find<MT extends BSON.Document, ST extends ZodRawShape>(
        method: "find" | "findOne",
        model: Model<MT, ST>,
        filter: Filter<MT> = {},
        options?: mongo.FindOptions
    ): Promise<MT[] | MT | null> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection<MT>(model.collection);

        if (method === "find")
            return collection
                .find(filter, options)
                .toArray()
                .then((docs) => docs as MT[]);
        else return collection.findOne(filter, options).then((doc) => doc as MT | null);
    }

    /**
     * Inserts a single document into the collection associated with the specified model.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to insert into.
     * @param {MT} data - The document to insert into the collection.
     * @param {mongo.InsertOneOptions} [options] - Optional settings for the insert operation. Learn more at
     *                                             {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/InsertOneOptions.html}.
     *
     * @returns {Promise<mongo.InsertOneResult<BSON.Document>>} A promise that resolves to the result of the insert operation.
     *
     * @example
     * // Insert a new user document into the collection.
     * const result = await mongooat.model.insertOne(UserModel, { name: "John Doe", age: 30 });
     */
    public async insertOne<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        data: MT,
        options?: mongo.InsertOneOptions
    ): Promise<mongo.InsertOneResult<BSON.Document>> {
        return this._insert(model, data, options) as Promise<mongo.InsertOneResult<BSON.Document>>;
    }

    /**
     * Inserts multiple documents into the collection associated with the specified model.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to insert into.
     * @param {MT[]} data - An array of documents to insert into the collection.
     * @param {mongo.BulkWriteOptions} [options] - Optional settings for the bulk write operation. Learn more at
     *                                             {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/BulkWriteOptions.html}.
     *
     * @returns {Promise<mongo.InsertManyResult<BSON.Document>>} A promise that resolves to the result of the insert operation.
     *
     * @example
     * // Insert multiple user documents into the collection.
     * const result = await mongooat.model.insertMany(UserModel, [
     *   { name: "John Doe", age: 30 },
     *   { name: "Jane Doe", age: 25 }
     * ]);
     */
    public async insertMany<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        data: MT[],
        options?: mongo.BulkWriteOptions
    ): Promise<mongo.InsertManyResult<BSON.Document>> {
        return this._insert(model, data, options) as Promise<mongo.InsertManyResult<BSON.Document>>;
    }

    private async _insert<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        data: MT | MT[],
        options?: mongo.InsertOneOptions | mongo.BulkWriteOptions
    ): Promise<mongo.InsertOneResult<BSON.Document> | mongo.InsertManyResult<BSON.Document>> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection(model.collection);

        if (Array.isArray(data)) {
            data = await Promise.all(data.map((doc) => model.parse(doc)));

            // TODO: add option to insert fulfilled data and return rejected one using allSettled
            return collection.insertMany(data, options as mongo.BulkWriteOptions);
        } else {
            data = await model.parse(data);
            return collection.insertOne(data, options as mongo.InsertOneOptions);
        }
    }

    /**
     * Updates a single document in the collection associated with the specified model that matches the given filter criteria.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to update.
     * @param {Filter<MT>} filter - The filter criteria to locate the document to update.
     * @param {Partial<MT>} update - The update operations to be applied to the document.
     * @param {mongo.UpdateOptions} [options] - Optional settings for the update operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/UpdateOptions.html}.
     *
     * @returns {Promise<mongo.UpdateResult>} A promise that resolves to the result of the update operation.
     *
     * @example
     * // Update a user's age in the collection.
     * const result = await mongooat.model.updateOne(UserModel, { name: "John Doe" }, { age: 31 });
     */
    public async updateOne<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>,
        options?: mongo.UpdateOptions
    ): Promise<mongo.UpdateResult> {
        return this._update("updateOne", model, filter, update, options);
    }

    /**
     * Updates multiple documents in the collection associated with the specified model that match the given filter criteria.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to update.
     * @param {Filter<MT>} filter - The filter criteria to locate the documents to update.
     * @param {Partial<MT>} update - The update operations to be applied to the documents.
     * @param {mongo.UpdateOptions} [options] - Optional settings for the update operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/UpdateOptions.html}.
     *
     * @returns {Promise<mongo.UpdateResult>} A promise that resolves to the result of the update operation.
     *
     * @example
     * // Update the age of multiple users in the collection.
     * const result = await mongooat.model.updateMany(UserModel, { age: { $lt: 30 } }, { age: 30 });
     */
    public async updateMany<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>,
        options?: mongo.UpdateOptions
    ): Promise<mongo.UpdateResult> {
        return this._update("updateMany", model, filter, update, options);
    }

    private async _update<MT extends BSON.Document, ST extends ZodRawShape>(
        method: "updateOne" | "updateMany",
        model: Model<MT, ST>,
        filter: Filter<MT>,
        update: Partial<MT>,
        options?: mongo.UpdateOptions
    ): Promise<mongo.UpdateResult> {
        if (!this._currDb) throw new DBNotSetError();
        await model.parse(update, true);

        const collection = this._currDb.collection<MT>(model.collection);
        return collection[method](filter, { $set: update }, options);
    }

    /**
     * Replaces a single document in the collection associated with the specified model that matches the given filter criteria.
     * The entire document is replaced with the provided replacement document.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to update.
     * @param {Filter<MT>} filter - The filter criteria to locate the document to replace.
     * @param {MT} replacement - The replacement document that will replace the existing document.
     * @param {mongo.ReplaceOptions} [options] - Optional settings for the replace operation. Learn more at
     *                                           {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/ReplaceOptions.html}.
     *
     * @returns {Promise<mongo.UpdateResult<MT>>} A promise that resolves to the result of the replace operation.
     *
     * @example
     * // Replace a user's document in the collection.
     * const result = await mongooat.model.replaceOne(UserModel, { name: "John Doe" }, { name: "John Doe", age: 31 });
     */
    public async replaceOne<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        replacement: MT,
        options?: mongo.ReplaceOptions
    ): Promise<mongo.UpdateResult<MT>> {
        if (!this._currDb) throw new DBNotSetError();
        await model.parse(replacement);

        const collection = this._currDb.collection<MT>(model.collection);
        return collection.replaceOne(filter, replacement, options).then((res) => res as mongo.UpdateResult<MT>);
    }

    /**
     * Deletes a single document in the collection associated with the specified model that matches the given filter criteria.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to delete from.
     * @param {Filter<MT>} filter - The filter criteria to locate the document to delete.
     * @param {mongo.DeleteOptions} [options] - Optional settings for the delete operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/DeleteOptions.html}.
     *
     * @returns {Promise<mongo.DeleteResult>} A promise that resolves to the result of the delete operation.
     *
     * @example
     * // Delete a user document from the collection.
     * const result = await mongooat.model.deleteOne(UserModel, { name: "John Doe" });
     */
    public async deleteOne<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options?: mongo.DeleteOptions
    ): Promise<mongo.DeleteResult> {
        return this._delete("deleteOne", model, filter, options);
    }

    /**
     * Deletes multiple documents in the collection associated with the specified model that match the given filter criteria.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to delete from.
     * @param {Filter<MT>} filter - The filter criteria to locate the documents to delete.
     * @param {mongo.DeleteOptions} [options] - Optional settings for the delete operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/DeleteOptions.html}.
     *
     * @returns {Promise<mongo.DeleteResult>} A promise that resolves to the result of the delete operation.
     *
     * @example
     * // Delete multiple user documents from the collection.
     * const result = await mongooat.model.deleteMany(UserModel, { age: { $lt: 30 } });
     */
    public async deleteMany<MT extends BSON.Document, ST extends ZodRawShape>(
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options?: mongo.DeleteOneModel
    ): Promise<mongo.DeleteResult> {
        return this._delete("deleteMany", model, filter, options);
    }

    private async _delete<MT extends BSON.Document, ST extends ZodRawShape>(
        method: "deleteOne" | "deleteMany",
        model: Model<MT, ST>,
        filter: Filter<MT>,
        options?: mongo.DeleteOptions
    ): Promise<mongo.DeleteResult> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection<MT>(model.collection);
        return collection[method](filter, options);
    }
}

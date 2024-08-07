import { Model } from "./baseModel.js";
import { ZodObject, ZodRawShape } from "zod";
import { validateSchema } from "./helpers/validateSchema.js";
import mongo, { BSON, Filter, ModifyResult, ObjectId } from "mongodb";
import { generateUpdateSchema } from "./helpers/generateUpdateSchema.js";
import { DefaultModelOptions, ModelOptions } from "./options/modelOptions.js";
import { processUndefinedFieldsForUpdate, removeUndefinedFields } from "./helpers/processUndefindedFields.js";

import DBNotSetError from "./error/dbNotSet.js";
import ValidateError from "./error/validate.js";
import MethodExistedError from "./error/methodExisted.js";
import InvalidSchemaError from "./error/invalidSchema.js";
import MethodNotFoundError from "./error/methodNotFound.js";
import IdFieldNotAllowedError from "./error/idFieldNotAllowed.js";

import type { TypeOf, ModelType, UpdateType, OmitId, ModelMethods } from "./types.js";

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
     * @param {ModelType} model - The model representing the MongoDB collection to query.
     * @param {Filter<T>} [filter] - Optional filter criteria to apply to the find operation.
     * @param {mongo.FindOptions} [options] - Optional settings for the `find` operation. Learn more at
     *                                        {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html}.
     *
     * @returns {Promise<T[]>} A promise that resolves to an array of documents matching the criteria.
     *
     * @example
     * // Find all user documents in the collection.
     * const users = await mongooat.model.find(UserModel);
     */
    public async find<T extends TypeOf<MT>, MT extends ModelType>(model: MT): Promise<T[]>;
    public async find<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options?: mongo.FindOptions
    ): Promise<T[]>;
    public async find<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter?: Filter<T>,
        options?: mongo.FindOptions
    ): Promise<T[]> {
        return this._find("find", model, filter, options) as Promise<T[]>;
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID.
     *
     * @param {Model<MT, ST>} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find.
     * @param {mongo.FindOptions} [options] - Optional settings for the `findById` operation. Learn more at
     *                                        {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html}.
     *
     * @returns {Promise<MT | null>} A promise that resolves to the document matching the ID.
     *                               If no document is found, the promise resolves to null.
     *
     * @example
     * // Find a user document with the specified ID.
     * const user = await mongooat.model.findById(UserModel, new ObjectId("64b175497dc71570edd625d2"));
     */
    public async findById<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        options?: mongo.FindOptions
    ): Promise<T | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<T>;
        return this.findOne(model, _id, options);
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID and updates it.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find and update.
     * @param {UpdateType<T>} update - The update to apply to the document.
     * @param {mongo.FindOneAndUpdateOptions} [options] - Optional settings for the `findByIdAndUpdate` operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndUpdateOptions.html}.
     *
     * @returns {Promise<ModifyResult<T> | T | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Update a user document with the specified ID and return the original document (before updated).
     * const updatedUser = await mongooat.model.findByIdAndUpdate(UserModel, "64b175497dc71570edd625d2", { name: "John Doe" });
     */
    public async findByIdAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        update: UpdateType<T>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<T>>;
    public async findByIdAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        update: UpdateType<T>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: false }
    ): Promise<T | null>;
    public async findByIdAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        update: UpdateType<T>,
        options: mongo.FindOneAndUpdateOptions
    ): Promise<T | null>;
    public async findByIdAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        update: UpdateType<T>
    ): Promise<T | null>;
    public async findByIdAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        update: UpdateType<T>,
        options?: mongo.FindOneAndUpdateOptions
    ): Promise<ModifyResult<T> | T | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<T>;
        if (!options) return this.findOneAndUpdate(model, _id, update);
        else return this.findOneAndUpdate(model, _id, update, options);
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID and replaces it.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find and replace.
     * @param {OmitId<T>} replacement - The replacement document.
     * @param {mongo.FindOneAndReplaceOptions} [options] - Optional settings for the `findByIdAndReplace` operation. Learn more at
     *                                                     {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndReplaceOptions.html}.
     *
     * @returns {Promise<ModifyResult<T> | T | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Replace a user document with a new one and return the original document (before replaced).
     * const replacedUser = await mongooat.model.findByIdAndReplace(UserModel, "64b175497dc71570edd625d2", { name: "John Doe" });
     */
    public async findByIdAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        replacement: OmitId<T>,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<T>>;
    public async findByIdAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        replacement: OmitId<T>,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: false }
    ): Promise<T | null>;
    public async findByIdAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        replacement: OmitId<T>,
        options: mongo.FindOneAndReplaceOptions
    ): Promise<T | null>;
    public async findByIdAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        replacement: OmitId<T>
    ): Promise<T | null>;
    public async findByIdAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        replacement: OmitId<T>,
        options?: mongo.FindOneAndReplaceOptions
    ): Promise<ModifyResult<T> | T | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<T>;
        if (!options) return this.findOneAndReplace(model, _id, replacement);
        else return this.findOneAndReplace(model, _id, replacement, options);
    }

    /**
     * Finds a document in the collection associated with the specified model by its ID and deletes it.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to query.
     * @param {string | ObjectId} id - The ID of the document to find and delete.
     * @param {mongo.FindOneAndDeleteOptions} [options] - Optional settings for the `findByIdAndDelete` operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndDeleteOptions.html}.
     *
     * @returns {Promise<ModifyResult<T> | T | null>} A promise that resolves to the deleted document or `null` if no document is found.
     *
     * @example
     * // Delete a user document with the specified ID and return the deleted document.
     * const deletedUser = await mongooat.model.findByIdAndDelete(UserModel, "64b175497dc71570edd625d2");
     */
    public async findByIdAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<T>>;
    public async findByIdAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: false }
    ): Promise<T | null>;
    public async findByIdAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        options: mongo.FindOneAndDeleteOptions
    ): Promise<T | null>;
    public async findByIdAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId
    ): Promise<T | null>;
    public async findByIdAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        id: string | ObjectId,
        options?: mongo.FindOneAndDeleteOptions
    ): Promise<ModifyResult<T> | T | null> {
        const _id = { _id: id instanceof ObjectId ? id : new ObjectId(id) } as Filter<T>;
        if (!options) return this.findOneAndDelete(model, _id);
        else return this.findOneAndDelete(model, _id, options);
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to query.
     * @param {Filter<T>} [filter] - Optional filter criteria to apply to the find operation.
     * @param {mongo.FindOptions} [options] - Optional settings for the `findOne` operation. Learn more at
     *                                        {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOptions.html}.
     *
     * @returns {Promise<T | null>} A promise that resolves to the first document matching the criteria.
     *
     * @example
     * // Find a user document with the specified name.
     * const user = await mongooat.model.findOne(UserModel, { name: "John Doe" });
     */
    public async findOne<T extends TypeOf<MT>, MT extends ModelType>(model: MT): Promise<T | null>;
    public async findOne<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options?: mongo.FindOptions
    ): Promise<T | null>;
    public async findOne<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter?: Filter<T>,
        options?: mongo.FindOptions
    ): Promise<T | null> {
        return this._find("findOne", model, filter, options) as Promise<T | null>;
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria and updates it.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to update.
     * @param {Filter<T>} filter - The filter criteria to locate the document to update.
     * @param {UpdateType<T>} update - The update operations to be applied to the document.
     * @param {mongo.FindOneAndUpdateOptions} [options] - Options for the `findOneAndUpdate` operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndUpdateOptions.html}.
     *
     * @returns {Promise<ModifyResult<T> | T | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Update a user's age and return the original document (before updated).
     * const user = await mongooat.model.findOneAndUpdate(UserModel, { name: "John Doe" }, { age: 30 });
     */
    public async findOneAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<T>>;
    public async findOneAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>,
        options: mongo.FindOneAndUpdateOptions & { includeResultMetadata: false }
    ): Promise<T | null>;
    public async findOneAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>,
        options: mongo.FindOneAndUpdateOptions
    ): Promise<T | null>;
    public async findOneAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>
    ): Promise<T | null>;
    public async findOneAndUpdate<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>,
        options?: mongo.FindOneAndUpdateOptions
    ): Promise<ModifyResult<T> | T | null> {
        if (!this._currDb) throw new DBNotSetError();
        if (Object.keys(update).includes("_id")) throw new IdFieldNotAllowedError();

        await model.parse(update, true);

        const { set, unset } = processUndefinedFieldsForUpdate(update);
        const updateFilter = { $set: set as Partial<T>, $unset: unset };

        const collection = this._currDb.collection<T>(model.collection);

        let res;
        if (options) {
            if (options.includeResultMetadata)
                return collection.findOneAndUpdate(
                    filter,
                    updateFilter,
                    options as mongo.FindOneAndUpdateOptions & { includeResultMetadata: true }
                );

            res = collection.findOneAndUpdate(filter, updateFilter, options);
        } else res = collection.findOneAndUpdate(filter, updateFilter);

        return res.then(async (doc) => (doc ? (doc as T) : null));
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria and replaces it.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to query.
     * @param {Filter<T>} filter - The filter criteria to locate the document to update.
     * @param {OmitId<T>} replacement - The replacement document.
     * @param {mongo.FindOneAndReplaceOptions} [options] - Optional settings for the `findOneAndReplace` operation. Learn more at
     *                                                     {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndReplaceOptions.html}.
     *
     * @returns {Promise<ModifyResult<T> | T | null>} A promise that resolves to the original document or `null` if no document is found.
     *
     * @example
     * // Replace a user document with a new one and return the original document (before replaced).
     * const replacedUser = await mongooat.model.findOneAndReplace(UserModel, { name: "John Doe" }, { name: "Jane Doe" });
     */
    public async findOneAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        replacement: OmitId<T>,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<T>>;
    public async findOneAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        replacement: OmitId<T>,
        options: mongo.FindOneAndReplaceOptions & { includeResultMetadata: false }
    ): Promise<T | null>;
    public async findOneAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        replacement: OmitId<T>,
        options: mongo.FindOneAndReplaceOptions
    ): Promise<T | null>;
    public async findOneAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        replacement: OmitId<T>
    ): Promise<T | null>;
    public async findOneAndReplace<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        replacement: OmitId<T>,
        options?: mongo.FindOneAndReplaceOptions
    ): Promise<ModifyResult<T> | T | null> {
        if (!this._currDb) throw new DBNotSetError();
        replacement = (await model.parse(replacement)) as OmitId<T>;

        const collection = this._currDb.collection<T>(model.collection);

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

        return res.then((doc) => (doc ? (doc as T) : null));
    }

    /**
     * Finds a document in the collection associated with the specified model that match the specified filter criteria and deletes it.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to update.
     * @param {Filter<T>} filter - The filter criteria to locate the document to delete.
     * @param {mongo.FindOneAndDeleteOptions} [options] - Options for the `findOneAndDelete` operation. Learn more at
     *                                                    {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/FindOneAndDeleteOptions.html}.
     *
     * @returns {Promise<ModifyResult<T> | T | null>} A promise that resolves to the deleted document or `null` if no document is found.
     *
     * @example
     * // Delete a user's document with the specified name and return the deleted document.
     * const user = await mongooat.model.findOneAndDelete(UserModel, { name: "John Doe" });
     */
    public async findOneAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: true }
    ): Promise<ModifyResult<T>>;
    public async findOneAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options: mongo.FindOneAndDeleteOptions & { includeResultMetadata: false }
    ): Promise<T | null>;
    public async findOneAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options: mongo.FindOneAndDeleteOptions
    ): Promise<T | null>;
    public async findOneAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>
    ): Promise<T | null>;
    public async findOneAndDelete<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options?: mongo.FindOneAndDeleteOptions
    ): Promise<ModifyResult<T> | T | null> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection<T>(model.collection);

        let res;
        if (options) {
            if (options.includeResultMetadata)
                return collection.findOneAndDelete(
                    filter,
                    options as mongo.FindOneAndDeleteOptions & { includeResultMetadata: true }
                );

            res = collection.findOneAndDelete(filter, options);
        } else res = collection.findOneAndDelete(filter);

        return res.then((doc) => (doc ? (doc as T) : null));
    }

    private async _find<T extends TypeOf<MT>, MT extends ModelType>(
        method: "find" | "findOne",
        model: MT,
        filter: Filter<T> = {},
        options?: mongo.FindOptions
    ): Promise<T[] | T | null> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection<T>(model.collection);
        const isCheckOnGet = model.checkOnGet;

        if (method === "find") {
            const docs = await collection.find(filter, options).toArray();
            return (isCheckOnGet ? await Promise.all(docs.map((doc) => model.parse(doc))) : docs) as T[];
        } else {
            const doc = await collection.findOne(filter, options);
            return (isCheckOnGet && doc ? await model.parse(doc) : doc) as T | null;
        }
    }

    /**
     * Inserts a single document into the collection associated with the specified model.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to insert into.
     * @param {T} data - The document to insert into the collection.
     * @param {mongo.InsertOneOptions} [options] - Optional settings for the insert operation. Learn more at
     *                                             {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/InsertOneOptions.html}.
     *
     * @returns {Promise<mongo.InsertOneResult>} A promise that resolves to the result of the insert operation.
     *
     * @example
     * // Insert a new user document into the collection.
     * const result = await mongooat.model.insertOne(UserModel, { name: "John Doe", age: 30 });
     */
    public async insertOne<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        data: T,
        options?: mongo.InsertOneOptions
    ): Promise<mongo.InsertOneResult> {
        return this._insert(model, data, options) as Promise<mongo.InsertOneResult>;
    }

    /**
     * Inserts multiple documents into the collection associated with the specified model.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to insert into.
     * @param {T[]} data - An array of documents to insert into the collection.
     * @param {mongo.BulkWriteOptions} [options] - Optional settings for the bulk write operation. Learn more at
     *                                             {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/BulkWriteOptions.html}.
     *
     * @returns {Promise<mongo.InsertManyResult>} A promise that resolves to the result of the insert operation.
     *
     * @example
     * // Insert multiple user documents into the collection.
     * const result = await mongooat.model.insertMany(UserModel, [
     *   { name: "John Doe", age: 30 },
     *   { name: "Jane Doe", age: 25 }
     * ]);
     */
    public async insertMany<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        data: T[],
        options?: mongo.BulkWriteOptions
    ): Promise<mongo.InsertManyResult> {
        return this._insert(model, data, options) as Promise<mongo.InsertManyResult>;
    }

    private async _insert<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        data: T | T[],
        options?: mongo.InsertOneOptions | mongo.BulkWriteOptions
    ): Promise<mongo.InsertOneResult | mongo.InsertManyResult> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection(model.collection);

        if (Array.isArray(data)) {
            data = (await Promise.all(data.map((doc) => model.parse(doc)))) as T[];
            return collection.insertMany(data, options as mongo.BulkWriteOptions);
        } else {
            data = (await model.parse(data)) as T;
            return collection.insertOne(data, options as mongo.InsertOneOptions);
        }
    }

    /**
     * Updates a single document in the collection associated with the specified model that matches the given filter criteria.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to update.
     * @param {Filter<T>} filter - The filter criteria to locate the document to update.
     * @param {UpdateType<T>} update - The update operations to be applied to the document.
     * @param {mongo.UpdateOptions} [options] - Optional settings for the update operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/UpdateOptions.html}.
     *
     * @returns {Promise<mongo.UpdateResult>} A promise that resolves to the result of the update operation.
     *
     * @example
     * // Update a user's age in the collection.
     * const result = await mongooat.model.updateOne(UserModel, { name: "John Doe" }, { age: 31 });
     */
    public async updateOne<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>,
        options?: mongo.UpdateOptions
    ): Promise<mongo.UpdateResult> {
        return this._update("updateOne", model, filter, update, options);
    }

    /**
     * Updates multiple documents in the collection associated with the specified model that match the given filter criteria.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to update.
     * @param {Filter<T>} filter - The filter criteria to locate the documents to update.
     * @param {UpdateType<T>} update - The update operations to be applied to the documents.
     * @param {mongo.UpdateOptions} [options] - Optional settings for the update operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/UpdateOptions.html}.
     *
     * @returns {Promise<mongo.UpdateResult>} A promise that resolves to the result of the update operation.
     *
     * @example
     * // Update the age of multiple users in the collection.
     * const result = await mongooat.model.updateMany(UserModel, { age: { $lt: 30 } }, { age: 30 });
     */
    public async updateMany<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>,
        options?: mongo.UpdateOptions
    ): Promise<mongo.UpdateResult> {
        return this._update("updateMany", model, filter, update, options);
    }

    private async _update<T extends TypeOf<MT>, MT extends ModelType>(
        method: "updateOne" | "updateMany",
        model: MT,
        filter: Filter<T>,
        update: UpdateType<T>,
        options?: mongo.UpdateOptions
    ): Promise<mongo.UpdateResult> {
        if (!this._currDb) throw new DBNotSetError();
        if (Object.keys(update).includes("_id")) throw new IdFieldNotAllowedError();
        await model.parse(update, true);

        const { set, unset } = processUndefinedFieldsForUpdate(update);

        const collection = this._currDb.collection<T>(model.collection);
        return collection[method](filter, { $set: set as Partial<T>, $unset: unset }, options);
    }

    /**
     * Replaces a single document in the collection associated with the specified model that matches the given filter criteria.
     * The entire document is replaced with the provided replacement document.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to update.
     * @param {Filter<T>} filter - The filter criteria to locate the document to replace.
     * @param {OmitId<T>} replacement - The replacement document that will replace the existing document.
     * @param {mongo.ReplaceOptions} [options] - Optional settings for the replace operation. Learn more at
     *                                           {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/ReplaceOptions.html}.
     *
     * @returns {Promise<mongo.UpdateResult>} A promise that resolves to the result of the replace operation.
     *
     * @example
     * // Replace a user's document in the collection.
     * const result = await mongooat.model.replaceOne(UserModel, { name: "John Doe" }, { name: "John Doe", age: 31 });
     */
    public async replaceOne<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        replacement: OmitId<T>,
        options?: mongo.ReplaceOptions
    ): Promise<mongo.UpdateResult> {
        if (!this._currDb) throw new DBNotSetError();
        replacement = (await model.parse(replacement)) as OmitId<T>;
        if (replacement._id) delete replacement._id;

        const collection = this._currDb.collection<T>(model.collection);
        return collection.replaceOne(filter, replacement, options) as Promise<mongo.UpdateResult>;
    }

    /**
     * Deletes a single document in the collection associated with the specified model that matches the given filter criteria.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to delete from.
     * @param {Filter<T>} filter - The filter criteria to locate the document to delete.
     * @param {mongo.DeleteOptions} [options] - Optional settings for the delete operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/DeleteOptions.html}.
     *
     * @returns {Promise<mongo.DeleteResult>} A promise that resolves to the result of the delete operation.
     *
     * @example
     * // Delete a user document from the collection.
     * const result = await mongooat.model.deleteOne(UserModel, { name: "John Doe" });
     */
    public async deleteOne<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options?: mongo.DeleteOptions
    ): Promise<mongo.DeleteResult> {
        return this._delete("deleteOne", model, filter, options);
    }

    /**
     * Deletes multiple documents in the collection associated with the specified model that match the given filter criteria.
     *
     * @param {ModelType} model - The model representing the MongoDB collection to delete from.
     * @param {Filter<T>} filter - The filter criteria to locate the documents to delete.
     * @param {mongo.DeleteOptions} [options] - Optional settings for the delete operation. Learn more at
     *                                          {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/DeleteOptions.html}.
     *
     * @returns {Promise<mongo.DeleteResult>} A promise that resolves to the result of the delete operation.
     *
     * @example
     * // Delete multiple user documents from the collection.
     * const result = await mongooat.model.deleteMany(UserModel, { age: { $lt: 30 } });
     */
    public async deleteMany<T extends TypeOf<MT>, MT extends ModelType>(
        model: MT,
        filter: Filter<T>,
        options?: mongo.DeleteOneModel
    ): Promise<mongo.DeleteResult> {
        return this._delete("deleteMany", model, filter, options);
    }

    private async _delete<T extends TypeOf<MT>, MT extends ModelType>(
        method: "deleteOne" | "deleteMany",
        model: MT,
        filter: Filter<T>,
        options?: mongo.DeleteOptions
    ): Promise<mongo.DeleteResult> {
        if (!this._currDb) throw new DBNotSetError();

        const collection = this._currDb.collection<T>(model.collection);
        return collection[method](filter, options);
    }
}

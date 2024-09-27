import { z } from "zod";
import { Model } from "./model.js";
import { MongoClient } from "mongodb";

import DBNotSetError from "./error/dbNotSet.js";

import type { ZodObject, ZodRawShape } from "zod";
import type { TypeOf, GetPaths } from "./model.js";
import type { ModelOptions } from "./options/modelOptions.js";
import type { BSON, Collection, CreateCollectionOptions, Db, DbOptions, MongoClientOptions, WithId } from "mongodb";

// type infer, paths inspired by Zod
namespace Mongooat {
    /**
     * Get the type of a model instance.
     *
     * @example
     * type User = Mongooat.infer<typeof UserModel>;
     */
    export type infer<T extends Model<any, any>> = TypeOf<T>;

    /**
     * Returns all possible key paths of an object type, including nested objects and arrays.
     *
     * For arrays, the key path will include the array index.
     * If you use `<idx>` as the index key, it will refer to every element in the array.
     *
     * **Note:**
     * Unsupported nested types:
     *  - Maps, Sets, Records
     *
     * @example
     * type UserPaths = Mongooat.paths<typeof UserModel>;
     * // "name" | "age" | "address" | "address.city" | "address.country" | "roles" | "roles.<idx>"
     */
    export type paths<T extends Model<any, any>> = GetPaths<T>;
}

/**
 * The `Mongooat` class serves as the main entry point for interacting with MongoDB using a schema-based approach.
 * It provides functionality to connect to a MongoDB database, switch between databases, and define models with
 * structured schemas using Zod for validation.
 *
 * @public
 *
 * @example
 * import { Mongooat, z } from "mongooat";
 *
 * // Create a new Mongooat instance and connect to a MongoDB database
 * const mongooat = new Mongooat("mongodb://localhost:27017");
 *
 * // Use a specific database
 * mongooat.useDb("mydb");
 *
 * // Define a model with a schema
 * const UserModel = mongooat.Model("users", z.object({
 *   name: z.string(),
 *   age: z.number()
 * }));
 *
 * // Perform a find operation using the defined model
 * const users = await UserModel.find();
 */
class Mongooat {
    private _url: string;

    private _currDb?: Db;
    private _base: MongoClient;

    constructor(url: string, options?: MongoClientOptions) {
        this._url = url;
        this._base = new MongoClient(url, options);
        this._currDb = this._base.db();
    }

    /** Switches the current database context to the specified database name. */
    public useDb(dbName: string, options?: DbOptions): void {
        this._currDb = this._base.db(dbName, options);
    }

    /** Get the names of all databases on the MongoDB server. */
    public async getDbNames(): Promise<string[]> {
        return this._base
            .db()
            .admin()
            .listDatabases()
            .then((dbs) => dbs.databases.map((db) => db.name));
    }

    /** Get the names of all collections in the current database context. */
    public async getCollectionNames(): Promise<string[]> {
        if (!this._currDb) return [];
        return this._currDb
            .listCollections(undefined, { nameOnly: true })
            .toArray()
            .then((cols) => cols.map((col) => col.name));
    }

    /**
     * Creates a new collection in the database with the specified name and options.
     *
     * @param {string} name - The name of the collection to create.
     * @param {CreateCollectionOptions} options - Optional settings for the createCollection operation. Learn more at
     *                                            {@link https://mongodb.github.io/node-mongodb-native/6.7/interfaces/CreateCollectionOptions.html this}.
     *
     * @returns {Promise<Collection<Type>>} A promise that resolves when the collection is created.
     */
    public async createCollection<Type extends BSON.Document>(
        name: string,
        options?: CreateCollectionOptions
    ): Promise<Collection<Type>> {
        if (!this._currDb) throw new DBNotSetError();
        return await this._currDb.createCollection<Type>(name, options);
    }

    /** Close the connection to the MongoDB server. */
    public async close(force?: boolean): Promise<void> {
        return this._base.close(force);
    }

    /**
     * Creates and returns a new Model instance with the specified name, schema, and options.
     *
     * **Note:**
     * - `_id` field must not be an `array`, `tuple`, `undefined` or `unknown`.
     * - If the `_id` field is invalid, the schema type resolves to `never`.
     *
     * @param {string} name - The name of the model to create.
     * @param {ZodObject<ST>} schema - A Zod schema object defining the structure and validation rules for the model's data.
     * @param {ModelOptions<ST>} [options] - Optional configuration options for the model.
     *
     * @returns {Model<MT, ST>} - A new Model instance.
     */
    public Model<MT extends WithId<z.infer<ZodObject<ST>>>, ST extends ZodRawShape>(
        name: string,
        schema: z.ZodObject<ST>,
        options?: ModelOptions<MT>
    ): Model<MT, ST> {
        if (!this._currDb) throw new DBNotSetError();

        return new Model<MT, ST>(name, schema, this._currDb, options);
    }
}

export default Mongooat;

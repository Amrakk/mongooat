import mongo from "mongodb";
import { ZodObject, ZodRawShape, z } from "zod";
import { Model, MGModel, TypeOf } from "./model.js";
import { ModelOptions } from "./options/modelOptions.js";

namespace Mongooat {
    export type infer<T extends Model<mongo.BSON.Document, ZodRawShape>> = TypeOf<T>;
}

/**
 * The `Mongooat` class serves as the main entry point for interacting with MongoDB using a schema-based approach.
 * It provides functionality to connect to a MongoDB database, switch between databases, and define models with
 * structured schemas using Zod for validation.
 *
 * @public
 *
 * @example
 * // Example usage of the Mongooat class
 * import Mongooat from "mongooat";
 *
 * // Create a new Mongooat instance and connect to a MongoDB database
 * const mongooat = new Mongooat("mongodb://localhost:27017");
 *
 * // Switch to a specific database
 * mongooat.useDb("mydb");
 *
 * // Define a model with a schema
 * const UserModel = mongooat.Model("users", z.object({
 *   name: z.string(),
 *   age: z.number()
 * }));
 *
 * // Perform a find operation using the defined model
 * const users = await mongooat.model.find(UserModel);
 */
class Mongooat {
    private _url: string;

    private _model: MGModel;
    private _currDb?: mongo.Db;
    private _base: mongo.MongoClient;

    constructor(url: string, options?: mongo.MongoClientOptions) {
        this._url = url;
        this._base = new mongo.MongoClient(url, options);
        this._currDb = this._base.db();
        this._model = new MGModel(this._currDb);
    }

    /** Switches the current database context to the specified database name. */
    public useDb(dbName: string, options?: mongo.DbOptions): void {
        this._currDb = this._base.db(dbName);
        this._model.currDb = this._currDb;
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

    /** Returns the MGModel instance associated with this Mongooat instance. */
    public get model(): MGModel {
        return this._model;
    }

    /**
     * Creates and returns a new Model instance with the specified name, schema, and options.
     *
     * @param {string} name - The name of the model to create.
     * @param {ZodObject<ST>} schema - A Zod schema object defining the structure and validation rules for the model's data.
     * @param {ModelOptions<ST>} [options] - Optional configuration options for the model.
     * @returns {Model<z.infer<ZodObject<ST>>, ST>} A new Model instance.
     */
    public Model<ST extends ZodRawShape>(
        name: string,
        schema: ZodObject<ST>,
        options?: ModelOptions<ST>
    ): Model<z.infer<ZodObject<ST>>, ST> {
        type MT = z.infer<ZodObject<ST>>;
        return new Model<MT, ST>(name, schema, options);
    }
}

export default Mongooat;

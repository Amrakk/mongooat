import { BSON } from "mongodb";
import { ZodObject, ZodRawShape } from "zod";
import { validateSchema } from "./helpers/validateSchema.js";
import { generateUpdateSchema } from "./helpers/generateUpdateSchema.js";
import { DefaultModelOptions, ModelOptions } from "./options/modelOptions.js";
import { removeUndefinedFields } from "./helpers/processUndefindedFields.js";

import ValidateError from "./error/validate.js";
import MethodExistedError from "./error/methodExisted.js";
import InvalidSchemaError from "./error/invalidSchema.js";
import MethodNotFoundError from "./error/methodNotFound.js";
import { ModelMethods } from "./types.js";

/**
 * Represents a model that maps to a MongoDB collection and defines the structure of documents within that collection
 * using a Zod schema for validation. This class provides a foundation for creating, reading, updating, and deleting
 * documents in a type-safe manner.
 *
 * @template Methods - The TypeScript type that represents the methods available on the model.
 * @template Type - The TypeScript type that represents the shape of documents in the MongoDB collection.
 * @template SchemaType - The shape of the schema used for validation, defined using Zod.
 */
export class Model<Type extends BSON.Document, SchemaType extends ZodRawShape, Methods extends ModelMethods> {
    private _name: string;
    private _schema: ZodObject<SchemaType>;
    private _options: ModelOptions<SchemaType>;
    private _methods: ModelMethodWorker<Methods>;

    readonly _type: Type = {} as Type;

    constructor(name: string, schema: ZodObject<SchemaType>, options?: Partial<ModelOptions<SchemaType>>) {
        if (!validateSchema(schema)) throw new InvalidSchemaError(name);

        this._name = name;
        this._schema = schema;
        this._methods = new ModelMethodWorker<Methods>(name);

        options = options ?? {};
        options.collection = options.collection ?? name;
        this._options = { ...DefaultModelOptions, ...options };
    }

    // public setMethods<MM extends ModelMethods>(methods: MM) {
    //     if (!this._methods) this._methods = new ModelMethodWorker<MM>(this._name);

    //     for (const key in methods) {
    //         if (methods.hasOwnProperty(key)) {
    //             this._methods.bind(key, methods[key]);
    //         }
    //     }
    // }

    public get methods() {
        return this._methods;
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
    public get collection(): string {
        return this._options.collection ?? DefaultModelOptions.collection;
    }

    /** A getter for the model's checkOnGet option. */
    public get checkOnGet(): boolean {
        return this._options.checkOnGet ?? DefaultModelOptions.checkOnGet;
    }

    /**
     * Parses the provided data object using the model's schema and returns the result as a document of the specified type.
     *
     * @param data - The data object to parse.
     * @param isPartial - A boolean value indicating whether to parse the data as a partial document.
     *
     * @returns The parsed document object.
     */
    public async parse(data: BSON.Document): Promise<Type>;
    public async parse(data: BSON.Document, isPartial: true): Promise<Partial<Type>>;
    public async parse(data: BSON.Document, isPartial?: true): Promise<Type | Partial<Type>> {
        const schema = isPartial ? generateUpdateSchema(this.schema, data) : this.schema;
        const test = await schema.strict().safeParseAsync(data);

        if (!test.success) throw new ValidateError(this.name, test.error.errors);
        return (isPartial ? data : removeUndefinedFields(data)) as Type | Partial<Type>;
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
    public hideFields(data: Type, hiddenFields?: (keyof SchemaType)[]): Type;
    public hideFields(data: Type[], hiddenFields?: (keyof SchemaType)[]): Type[];
    public hideFields(data: Type | Type[], hiddenFields?: (keyof SchemaType)[]): Type | Type[] {
        // TODO: implements hide inner fields (nested fields)
        hiddenFields = hiddenFields ?? this._options.hiddenFields ?? [];
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

class ModelMethodWorker<Methods extends ModelMethods = ModelMethods> {
    private _name: string;
    private _methods: Methods = {} as Methods;

    constructor(name: string) {
        this._name = name;
    }

    /**
     * Binds a custom method to the model.
     *
     * @param {MethodName} name - The name of the method to bind.
     * @param {Methods[MethodName]} fn - The function to bind as a method.
     *
     * @example
     * // Bind a custom method to the model.
     * model.bind("customMethod", () => {
     *     console.log("This is a custom method.");
     * });
     */
    public bind<MethodName extends keyof Methods>(name: MethodName, fn: Methods[MethodName]): void {
        if (this._methods.hasOwnProperty(name)) throw new MethodExistedError(name.toString(), this._name);
        this._methods[name] = fn;
    }

    /**
     * Triggers a custom method bound to the model.
     *
     * @param {MethodName} name - The name of the method to trigger.
     * @param {Parameters<Methods[MethodName]>} args - The arguments to pass to the method.
     * @returns {ReturnType<Methods[MethodName]>} The return value of the triggered method.
     *
     * @example
     * // Trigger a custom method bound to the model.
     * model.trigger("customMethod", [arg1, arg2]);
     */
    public trigger<MethodName extends keyof Methods>(
        name: MethodName,
        args: Parameters<Methods[MethodName]>
    ): ReturnType<Methods[MethodName]> {
        const method = this._methods[name];
        if (!method) throw new MethodNotFoundError(name.toString(), this._name);

        return method(...args);
    }
}

import MongooatError from "../mongooatError.js";
import { InvalidSchemaMap } from "../../types.js";

/**
 * Thrown when an invalid schema is provided when creating a model.
 *
 * @extends MongooatError
 */
export default class InvalidSchemaError extends MongooatError {
    public modelName: string;
    public errorMap: InvalidSchemaMap;
    constructor(name: string, errorMap: InvalidSchemaMap) {
        super(`Invalid schema provided for model '${name}'`);
        this.modelName = name;
        this.errorMap = errorMap;
    }
}

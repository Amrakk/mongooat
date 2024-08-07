import MongooatError from "./mongooatError.js";

/**
 * Thrown when an invalid schema is provided when creating a model.
 *
 * @extends MongooatError
 */
export default class InvalidSchemaError extends MongooatError {
    constructor(name: string) {
        super(`Invalid schema provided for model "${name}"`);
    }
}

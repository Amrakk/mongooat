import MongooatError from "./mongooatError.js";

/**
 * Thrown when a model is attempted to be registered again.
 *
 * @extends MongooatError
 * @param {string} name - The name of the model that was attempted to be registered again.
 */
export default class ModelExistedError extends MongooatError {
    constructor(name: string) {
        super(`Model '${name}' already existed.`);
    }
}

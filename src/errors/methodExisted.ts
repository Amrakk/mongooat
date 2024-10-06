import MongooatError from "./mongooatError.js";

/**
 * Thrown when a method is attempted to be added again.
 *
 * @extends MongooatError
 * @param {string} method - The name of the method that was attempted to be added again.
 * @param {string} model - The name of the model that the method was attempted to be added to.
 */
export default class MethodExistedError extends MongooatError {
    constructor(method: string, model: string) {
        super(`Method '${method}' already exists in model '${model}'.`);
    }
}

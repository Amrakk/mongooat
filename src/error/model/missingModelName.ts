import MongooatError from "../mongooatError.js";

/**
 * Thrown when a model name is missing.
 *
 * @extends MongooatError
 */
export default class MissingModelNameError extends MongooatError {
    constructor() {
        super("Model name is required.");
    }
}

import MongooatError from "./mongooatError.js";

/**
 * `ModelExistedError` is designed to handle the specific case where an attempt is made to register
 * a model in Mongooat that has already been registered. This ensures that each model name is unique.
 *
 * @extends MongooatError
 * @param {string} name - The name of the model that was attempted to be registered again.
 */
class ModelExistedError extends MongooatError {
    constructor(name: string) {
        super(`Model ${name} already existed.`);
    }
}

export default ModelExistedError;

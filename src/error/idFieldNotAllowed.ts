import MongooatError from "./mongooatError.js";

/**
 * Thrown when the '_id' field is not allowed in an operation.
 *
 * @extends MongooatError
 */
export default class IdFieldNotAllowedError extends MongooatError {
    constructor() {
        super(`The '_id' field is not allowed in 'Update/Replace' operation.`);
    }
}

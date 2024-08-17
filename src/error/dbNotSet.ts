import MongooatError from "./mongooatError.js";

/**
 * Thrown when an operation is attempted without setting the database.
 *
 * @extends MongooatError
 */
export default class DBNotSetError extends MongooatError {
    constructor() {
        super("Database not set. Please use 'useDb()' to set the database.");
    }
}

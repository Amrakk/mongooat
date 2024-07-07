import MongooatError from "./mongooatError.js";

/**
 * `DBNotSetError` is designed to handle the case where Mongooat operations are
 * attempted before the database connection has been successfully established.
 *
 * @extends MongooatError
 */
export default class DBNotSetError extends MongooatError {
    constructor() {
        super("Database not set. Please use useDb() to set the database.");
    }
}

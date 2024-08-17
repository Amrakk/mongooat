/**
 * `MongooatError` serves as a custom error class that extends the native JavaScript `Error` class.
 *
 * @extends Error
 * @property {string} name - The name property is overridden to "MongooatError" to indicate the error's origin.
 * @param {string} [message] - Optional error message that describes the error, passed to the `Error` constructor.
 * @param {ErrorOptions} [options] - Optional `ErrorOptions` object that allows for configuring the error instance.
 */
export default class MongooatError extends Error {
    name = "MongooatError";

    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
    }
}

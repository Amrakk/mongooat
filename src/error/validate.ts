import { ZodIssue } from "zod";
import MongooatError from "./mongooatError.js";

/**
 * `ValidateError` is designed to handle validation errors specifically.It is designed
 * to encapsulate validation issues identified by Zod. This class stores an array
 * of `ZodIssue` objects, which represent individual validation problems.
 *
 * @extends MongooatError
 * @property {ZodIssue[]} errors - An array of `ZodIssue` instances representing the validation errors.
 * @param {string} name - The name of the model where the validation failed.
 * @param {ZodIssue[]} errors - An array of `ZodIssue` objects detailing the specific validation errors encountered.
 */
export default class ValidateError extends MongooatError {
    errors: ZodIssue[];
    constructor(name: string, errors: ZodIssue[]) {
        super(`Model ${name} validation failed`);
        this.errors = errors;
    }
}

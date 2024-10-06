import InvalidSchemaError from "./invalidSchema.js";
import MissingModelNameError from "./missingModelName.js";
import IdFieldNotAllowedError from "./idFieldNotAllowed.js";

const ModelError = {
    InvalidSchemaError,
    MissingModelNameError,
    IdFieldNotAllowedError,
};

export default ModelError;

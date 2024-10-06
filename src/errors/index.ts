export * from "./model/index.js";

import DBNotSetError from "./dbNotSet.js";
import MongooatError from "./mongooatError.js";
import ValidationError from "./validateError.js";
import ModelExistedError from "./modelExisted.js";
import MethodExistedError from "./methodExisted.js";
import MethodNotFoundError from "./methodNotFound.js";

export { DBNotSetError, MongooatError, ValidationError, ModelExistedError, MethodExistedError, MethodNotFoundError };

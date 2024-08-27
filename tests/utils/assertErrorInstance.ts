import { assert } from "chai";
import MongooatError from "../../src/error/mongooatError.js";

export function assertErrorInstance<T extends MongooatError>(fn: () => unknown, expectedError: T) {
    try {
        fn();
        assert.fail(`'${fn.name}' function expected to throw an error, but it did not.`);
    } catch (actualError) {
        assert.instanceOf(actualError, expectedError.constructor as { new (...args: any[]): T });
        assert.deepEqual(JSON.stringify(actualError), JSON.stringify(expectedError));
    }
}

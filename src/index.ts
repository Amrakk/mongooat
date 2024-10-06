import { z } from "zod";
import Mongooat from "./mongooat.js";
import MGErrors from "./errors/index.js";
import { ObjectId, BSON } from "mongodb";
import * as MGSchemas from "./schemas/index.js";

export { Mongooat, MGErrors, MGSchemas, ObjectId, BSON, z };
const mongooat = { Mongooat, MGErrors, MGSchemas, ObjectId, BSON, z };

export default mongooat;

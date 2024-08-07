import { BSON } from "mongodb";
import { ZodRawShape } from "zod";
import { Model } from "./baseModel.js";

export type ModelPluginType = { Methods: ModelMethods };
export type ModelMethods = { [key: string]: (...args: any[]) => any };

export type TypeOf<T extends Model<BSON.Document, ZodRawShape, ModelMethods>> = T["_type"];
export type ModelType = Model<BSON.Document, ZodRawShape, ModelMethods>;

export type OmitId<T> = Omit<T, "_id">;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UpdateType<T> = DeepPartial<OmitId<T>>;

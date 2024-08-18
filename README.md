# Mongooat

**Mongooat** is a TypeScript utility that combines Zod schemas with [MongoDB](http://mongodb.com), providing a straightforward method for model validation and type inference.

[![NPM version](https://badge.fury.io/js/mongooat.svg)](http://badge.fury.io/js/mongooat)
[![MIT License][license-shield]][license-url]

-   [Bug report](https://github.com/amrakk/Mongooat/issues/new?labels=bug&template=bug-report.md)
-   [Feature request](https://github.com/amrakk/Mongooat/issues/new?labels=enhancement&template=feature-request.md)

## Installation

Install `mongooat` using npm:

```bash
npm install mongooat
```

## Usage

### Import Mongooat

To get started, import the `Mongooat` and `Zod` from `mongooat`:

```ts
import { Mongooat, z } from "mongooat";
```

### Connecting to MongoDB

Create a new `Mongooat` instance and connect to your `MongoDB` database:

```ts
const mongooat = new Mongooat("mongodb://localhost:27017");
```

### Switching Databases

Switch between databases using the `useDb` method:

```ts
mongooat.useDb("mydb");
```

### Defining a Model

Define a model using a `Zod` schema:

```ts
const UserModel = mongooat.Model(
    "users",
    z.object({
        name: z.string(),
        age: z.number().optional(),
    })
);
```

### Performing Database Operations

With the defined model, you can now perform operations like finding documents:

```ts
const users = await UserModel.find();
```

You can use other operations like `findById()`, `insertOne()`, `deleteOne()`, etc.

```ts
const user = await UserModel.findById("userId");
```

### Type inference

Extract TypeScript type by inferring the type of any model with `Mongooat.infer<typeof Model>`.

```ts
type modelType = Mongooat.infer<typeof UserModel>;
// type ts = { name: string; age?: number | undefined; }
```

### Accessing Dot-Notation Paths

Extract type-safe paths for nested properties in your schema using `Mongooat.paths<typeof Model>`:

```ts
type modelPaths = Mongooat.paths<typeof UserModel>;
// type modelPaths = ("name" | "age")[]
```

For arrays, the key path will include the array index. If you use `<idx>` as the index key, it will refer to every element in the array.

**Note:** _This is not yet support unions, discriminated unions, intersections, maps, sets, and records._

## Contact

[![Discord][discord-shield]][discord-url]

## Acknowledgments

Credits to:

-   [Zod][zod-url]: TypeScript schema validation.
-   [Mongoose][mongoose-url] : ODM library for MongoDB

## License

This project is licensed under the MIT License. See the [LICENSE file](LICENSE) for details.

<!-- LINKS AND IMAGES -->

[license-shield]: https://img.shields.io/github/license/Amrakk/mongooat.svg
[license-url]: https://github.com/Amrakk/mongooat/blob/master/LICENSE
[discord-shield]: https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white
[discord-url]: https://discordapp.com/users/460114509307314186
[zod-url]: https://github.com/colinhacks/zod
[mongoose-url]: https://github.com/Automattic/mongoose

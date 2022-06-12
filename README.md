[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Introduction

Frapi is middleware and router for Express providing the following features:

- validation of request payload and query parameters,
- validation of response payload,
- automatic generation of an API client library,
- fully blown Typescript support (both on backend and in the generated client library),
- catching errors in asynchronous request handlers.

You can find a working example presenting all of the above in
[this CodeSandbox](https://codesandbox.io/s/ancient-morning-cd4vbo?file=/index.ts).

## Installation

Install the package as a dependency with `npm` or `yarn`:

- `npm install frapi`
- `yarn add frapi`

## Basic usage

```typescript
import express from "express";
import bodyParser from "body-parser";
import { Router } from "frapi";

const app = express().use(bodyParser.json());

// Create frapi router and attach it to the express app
const routes = new Router();
app.use(routes);

routes.get(
    {
        path: "/user/:id",
        // Define expected result shape. 
        // You can also define shapes of request payload and query parameters.
        response: { fullName: String, age: Number } 
    },
    (req, res) => {
        res.sendResponse({ fullName: "John Smith", age: 12 });
    }
);

app.listen(3000);
```

## Generating client library

You can generate a strongly typed client library based on the endpoints definition. Let's take the following example:

```typescript
import express from "express";
import bodyParser from "body-parser";
import { Router, saveEndpointsToFile } from "frapi";

const app = express().use(bodyParser.json());

// Create frapi router and attach it to the express app
const routes = new Router();
app.use(routes);

routes.post(
    {
        path: "/user/:id",
        name: 'createUser',
        body: { fullName: String, age: Number },
        response: { id: String, fullName: String, age: Number } 
    },
    (req, res) => {
        res.sendResponse({ ...req.body, id: req.params.id });
    }
);

// This traverses all the registered endpoints in the app and 
// generates a strongly typed client library
saveEndpointsToFile(app, "./api.ts", "ts")

app.listen(3000);
```

The code above will generate the following client library (`api.ts`):

```typescript
export async function createUser(id: string, body: { fullName: string; age: number }) {
    const response = await fetch(`/user/${id}`, { method: 'post',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), });
    const responseBody = (await response.json()) as { id: string; fullName: string; age: number };
    return { ok: response.ok, status: response.status, body: responseBody, headers: response.headers, response };
}
```

Both, request payload and response body are strongly typed. This establishes the contract between
your backend and frontend.

> :warning: The `saveEndpointsToFile` function implementation is currently in the proof-of-concept state.
> All contributions are highly appreciated!

## Validation syntax

The validation API uses `String`, `Boolean` and `Number`  constructors to define primitive types.
Nested structures are described as nested objects. For example:

```typescript
const User = {
    name: String,
    age: Number,
    isAdult: Boolean,
    address: {
        firstLine: String,
        secondLine: String,
    }
}
```

Optional fields are defined by adding `?` to their name. In the example below
both `name` and `surname` are optional (can be `undefined`):

```typescript
const User = {
    "name?": String,
    "surname?": String,
}
```

There's a number of helpers to define complex types:

- `ArrayOf(Type)` defines an array of objects of given types (`Type[]` in TypeScript).
- `MapOf(Type)` defines an map with values of provided type (`Record<String, Type>` in TypeScript).
- `AnyOf(A, B, C)` defines a union of types (`A | B | C` in TypeScript).
- `AllOf(A, B, C)` defines an intersection of types (`A & B & C` in TypeScript).

Example:

```typescript
import { ArrayOf, AnyOf } from 'frapi';

const User = {
    name: 'String',
    friends: ArrayOf(User),                       
    country: AnyOf('US' as const, 'UK' as const) 
}
```

### Custom validators

You can define custom validation logic with the following syntax:

```typescript
const NonEmptyString = {
  // The underlying type for TypeScript
  $type: String,
  // Validation method. Returns true, if the object is valid and false otherwise.
  // Can also throw an exception with validation error deatils 
  $validate: (text: string) => text.trim().length > 0
};
```

### Remarks

Fields starting with `$` are ignored during validation - you can't expect e.g. to successfully validate
an payload with a field `$name`.

Frapi rejects objects with fields that are not defined in the validation type. E.g. the following code will fail:

```typescript
import { validate } from 'frapi';
    
const User = { name: String, age: Number };

// Error - the field `city` is not in the type definition. 
validate(User, { name: "John", age: 25, city: 'London '})
```


### Acknowledgements

This project is built based on `express-list-endpoints` and `express-async-router`.

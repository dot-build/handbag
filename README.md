# handbag

A simple Dependency Injection container written in ES6.

Some ideas were taken from AngularJS' `$injector` service.

- Allow to nest injectors so you can separate containers by module, package, etc
- Accepts a `Symbol` as a provider or constant name.
- Allows only a provider (factory function or class) and constants
- Allows to register a "private" provider, i.e. a factory that will NOT be a singleton
- Allows to freeze the container (disables any further changes in the dependencies)

## Injector API

- .constant(name, value)
- .provide(name, provider, isShared = true)
- .provideShared(name, provider);
- .provideNotShared(name, provider);
- .has(name)
- .get(name, locals = {})
- .freeze()

## Static methods

- .createInjector()

## Usage

See the full API on [documentation page](https://doc.esdoc.org/github.com/dot-build/handbag/)

```js

// foo.service.js

const FOO = 123;
class FooService {
    constructor(FOO) {
        this.foo = FOO;
    }
}

export { FooService, FOO };

// foo.controller.js

export default class FooController {
    constructor(FooService, data) {
        this.service = FooService;
        this.data = data
    }
}

// app.js

import handbag from 'handbag';
import FooController from 'foo.controller.js';
import {FooService, FOO} from 'foo.service.js';

const di = handbag.createInjector();

di.constant('FOO', FOO);
di.provide('FooService', ['FOO', FooService]);
di.provide('FooController', FooController);

// instantiates FooController injecting the service on constructor
const data = { bar: 1 };
const ctrl = di.get('FooController', { data: data });

```

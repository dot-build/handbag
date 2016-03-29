# handbag

A simple Dependency Injection container written in ES6.

Some ideas taken from AngularJS' `$injector` service

## Usage

```js

// FooService.js

import di from 'handbag';

class FooService {
    constructor(FOO) {
        this.foo = FOO;
    }
}

di.constant('FOO', 123);
di.provide('FooService', ['FOO', FooService]);


// FooController.js

class FooController {
    constructor(FooService) {
        this.service = FooService;
    }
}

di.provide('FooController', FooController);


// app.js

// instantiates FooController injecting the service on constructor
const ctrl = di.get('FooController');
const service = di.get('FooService');

```

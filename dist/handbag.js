(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.handbag = factory());
}(this, function () { 'use strict';

    var babelHelpers = {};
    babelHelpers.typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

    babelHelpers.classCallCheck = function (instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    };

    babelHelpers.createClass = function () {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }

      return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    }();

    babelHelpers;

    var toString = Object.prototype.toString;
    var INSTANTIATING = {};
    var INJECTOR_FROZEN_ERROR = 'This injector is frozen and cannot be modified';

    var is = {
        array: function array(value) {
            return '[object Array]' === toString.call(value);
        },

        function: function _function(value) {
            return typeof value === 'function';
        },

        object: function object(value) {
            return value !== null && (typeof value === 'undefined' ? 'undefined' : babelHelpers.typeof(value)) === 'object';
        }
    };

    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

    /**
     * Dependency Injection container
     */

    var Injector = function () {
        function Injector() {
            babelHelpers.classCallCheck(this, Injector);

            this._reset();
        }

        /**
         * @param {string|Symbol} name
         * @param {Object} [locals={}]     Map of injectables to override
         */


        babelHelpers.createClass(Injector, [{
            key: 'get',
            value: function get(name) {
                var locals = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                if (!name) {
                    throw new Error('Dependency name is required');
                }

                if (is.array(name)) {
                    return name.map(function (item) {
                        return this.get(item, locals);
                    }, this);
                }

                if (name === 'handbag') {
                    return this;
                }

                var isInLocals = locals.hasOwnProperty(name);
                if (!isInLocals && typeof locals.getOwnPropertySymbols === 'function') {
                    isInLocals = locals.getOwnPropertySymbols().indexOf(name) !== -1;
                }

                if (isInLocals) {
                    return locals[name];
                }

                var stack = this.$stack;

                if (!this.has(name)) {
                    var error = 'Dependency not found: ' + name + (stack.length ? ' (' + stack.join(' <- ') + ')' : '');

                    throw new Error(error);
                }

                return this._getResource(name, locals);
            }

            /**
             * @param {string|Symbol} name
             * @param {Object} [locals]     Map of injectables to override
             */

        }, {
            key: '_getResource',
            value: function _getResource(name, locals) {
                if (this.hasLocalProvider(name)) {
                    return this.getOrCreate(name, locals);
                }

                var injector = this.$children.find(function (i) {
                    return i.hasLocalProvider(name);
                });
                return injector.getOrCreate(name, locals);
            }

            /**
             * Get a value from cache or instantiate a value from registered provider
             * @param {string|Symbol} name
             * @param {Object} [locals]     Map of injectables to override
             * @private
             */

        }, {
            key: 'getOrCreate',
            value: function getOrCreate(name, locals) {
                var cache = this.$cache;
                var stack = this.$stack;
                var providers = this.$providers;

                if (cache.has(name) && !this._isInstantiating(name)) {
                    return cache.get(name);
                }

                var error = void 0,
                    value = void 0;
                stack.push(name);

                try {
                    if (this._isInstantiating(name)) {
                        throw new Error('Circular dependency found: ' + stack.join(' <- '));
                    }

                    cache.set(name, INSTANTIATING);
                    value = this.instantiate(providers.get(name), locals);
                    cache.set(name, value);
                } catch (e) {
                    if (this._isInstantiating(name)) {
                        cache.delete(name);
                    }

                    error = e;
                } finally {
                    stack.pop();
                }

                if (error) {
                    throw error;
                }

                if (true === this.$privates[name]) {
                    cache.delete(name);
                }

                return value;
            }
        }, {
            key: '_isInstantiating',
            value: function _isInstantiating(name) {
                return this.$cache.get(name) === INSTANTIATING;
            }

            /**
             * Check for a provider in this injector and all children
             * @param {string|Symbol} name
             * @return {boolean}
             */

        }, {
            key: 'has',
            value: function has(name) {
                return this.hasLocalProvider(name) || this.hasChildProvider(name);
            }

            /**
             * Check for a provider only in this instance (not checking on children)
             * @param {string|Symbol} name
             * @return {boolean}
             */

        }, {
            key: 'hasLocalProvider',
            value: function hasLocalProvider(name) {
                var v = this.$cache.has(name) || this.$providers.has(name);
                return v;
            }

            /**
             * Check for a provider in all children injectors
             * @param {string|Symbol} name
             * @return {boolean}
             */

        }, {
            key: 'hasChildProvider',
            value: function hasChildProvider(name) {
                var v = Boolean(this.$children.find(function (i) {
                    return i.hasLocalProvider(name);
                }));
                return v;
            }

            /**
             * Register a provider for a value meant to be a singleton instance
             * @param {string|Symbol} name
             * @param {Function|Class} value
             */

        }, {
            key: 'provideShared',
            value: function provideShared(name, value) {
                return this.provide(name, value, true);
            }

            /**
             * Register a provider for a value meant to be recreated everytime it is required
             * @param {string|Symbol} name
             * @param {Function|Class} value
             */

        }, {
            key: 'provideNotShared',
            value: function provideNotShared(name, value) {
                return this.provide(name, value, false);
            }

            /**
             * Register a provider for a value
             * @param {string|Symbol} name
             * @param {Function|Class} value
             * @param {boolean} isShared
             */

        }, {
            key: 'provide',
            value: function provide(name, value) {
                var _this = this;

                var isShared = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

                if (is.object(name)) {
                    Object.keys(name).forEach(function (k) {
                        return _this.provide(k, name[k], isShared);
                    });
                    return;
                }

                if (this.$frozen) {
                    throw new Error(INJECTOR_FROZEN_ERROR);
                }

                if (is.array(value)) {
                    var provider = value[value.length - 1];

                    if (!is.function(provider)) {
                        throw new Error('Invalid provider for ' + name);
                    }

                    this._register(name, value, isShared);
                    return this;
                }

                if (is.function(value)) {
                    var _provider = this._parseDependencies(value);
                    _provider.push(value);

                    this._register(name, _provider, isShared);
                    return this;
                }

                this.constant(name, value);
                return this;
            }

            /**
             * Provider to any value that won't change during the injector lifecycle
             * @param {string|Symbol} name
             * @param {*} value
             */

        }, {
            key: 'constant',
            value: function constant(name, value) {
                var _this2 = this;

                if (is.object(name)) {
                    Object.keys(name).forEach(function (k) {
                        return _this2.constant(k, name[k]);
                    });
                    return;
                }

                if (this.$frozen) {
                    throw new Error(INJECTOR_FROZEN_ERROR);
                }

                this.$cache.set(name, value);
                return this;
            }

            /**
             * @param {Function} Type
             * @param {Object} [locals]
             */

        }, {
            key: 'instantiate',
            value: function instantiate(Type, locals) {
                var Constructor = function Constructor() {},
                    instance,
                    returnedValue;

                Constructor.prototype = (is.array(Type) ? Type[Type.length - 1] : Type).prototype;

                instance = new Constructor();
                returnedValue = this.invoke(Type, instance, locals);
                instance = is.object(returnedValue) || is.function(returnedValue) ? returnedValue : instance;

                return instance;
            }

            /**
             * @param {Function|Array} invokable    Either a function or an array with dependencies and a function
             * @param {Object} context
             * @param {Object} [locals]
             *
             * @example
             *
             * function fn(foo) {}
             * const context = {};
             *
             * handbag.invoke(fn, context, { foo: 1 });
             * handbag.invoke(['foo', fn], context, { foo: 1 });
             */

        }, {
            key: 'invoke',
            value: function invoke(invokable, context, locals) {
                var _invokable = void 0;

                if (is.array(invokable)) {
                    _invokable = this._getInvokableFromArray(invokable);
                } else if (is.function(invokable)) {
                    _invokable = this._getInvokableFromFunction(invokable);
                }

                if (!(_invokable && _invokable.method)) {
                    throw new Error('Invalid invokable value');
                }

                var _invokable2 = _invokable;
                var dependencies = _invokable2.dependencies;


                if (dependencies.length) {
                    dependencies = this.get(dependencies, locals);
                }

                return _invokable.method.apply(context || null, dependencies);
            }
        }, {
            key: '_getInvokableFromArray',
            value: function _getInvokableFromArray(array) {
                var dependencies = array.slice(0);
                var method = dependencies.pop();

                if (!is.function(method)) {
                    method = null;
                }

                return { dependencies: dependencies, method: method };
            }
        }, {
            key: '_getInvokableFromFunction',
            value: function _getInvokableFromFunction(fn) {
                var dependencies = fn.$inject || this._parseDependencies(fn);

                return { dependencies: dependencies, method: fn };
            }
        }, {
            key: '_annotateConstructor',
            value: function _annotateConstructor() {
                var args = Array.from(arguments),
                    Constructor = args.pop();

                Constructor.$inject = args;

                return Constructor;
            }
        }, {
            key: '_parseDependencies',
            value: function _parseDependencies(fn) {
                var match = fn.toString().match(FN_ARGS),
                    fnArgs = match && match[1];

                return fnArgs && fnArgs.split(',').map(function (arg) {
                    return arg.trim();
                }) || [];
            }
        }, {
            key: '_register',
            value: function _register(name, provider, isShared) {
                if (this.$providers.has(name)) {
                    throw new Error('Cannot register a dependency that already exists: ' + name);
                }

                var value = this._annotateConstructor.apply(null, provider);
                this.$providers.set(name, value);

                if (!isShared) {
                    this.$privates[name] = true;
                }
            }

            /**
             * Lock this injector to prevent any further registration of values
             */

        }, {
            key: 'freeze',
            value: function freeze() {
                this.$frozen = true;
            }

            /**
             * Reset all the values declared in this injector
             * @private
             */

        }, {
            key: '_reset',
            value: function _reset() {
                this.$cache = new Map();
                this.$providers = new Map();
                this.$privates = {};
                this.$stack = [];
                this.$children = [];
            }

            /**
             * @param {Injector} injector
             */

        }, {
            key: 'addInjector',
            value: function addInjector(injector) {
                this.$children.push(injector);
            }

            /**
             * @return {Injector}
             */

        }], [{
            key: 'createInjector',
            value: function createInjector() {
                return new Injector();
            }
        }]);
        return Injector;
    }();

    return Injector;

}));
//# sourceMappingURL=handbag.js.map
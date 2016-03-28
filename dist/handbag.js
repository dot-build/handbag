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
         * @param {string} name
         * @param {Object} [locals]     Map of injectables to override
         */


        babelHelpers.createClass(Injector, [{
            key: 'get',
            value: function get(name, locals) {
                if (is.array(name)) {
                    return name.map(function (item) {
                        return this.get(item, locals);
                    }, this);
                }

                if (name === 'handbag') {
                    return this;
                }

                if (locals && locals.hasOwnProperty(name)) {
                    return locals[name];
                }

                var cache = this.$cache;

                if (cache.hasOwnProperty(name) && cache[name] !== INSTANTIATING) {
                    return cache[name];
                }

                var resource = this._getOrCreate(name, locals);

                if (true === this.$privates[name]) {
                    delete cache[name];
                }

                // stack.pop();
                return resource;
            }

            /**
             * @private
             */

        }, {
            key: '_getOrCreate',
            value: function _getOrCreate(name, locals) {
                var cache = this.$cache;
                var stack = this.$stack;
                var providers = this.$providers;

                var error = void 0;

                stack.push(name);

                try {
                    if (!providers.hasOwnProperty(name)) {
                        throw new Error('Dependency not found: ' + stack.join(' <- '));
                    }

                    if (cache[name] === INSTANTIATING) {
                        throw new Error('Circular dependency found: ' + stack.join(' <- '));
                    }

                    cache[name] = INSTANTIATING;
                    cache[name] = this.instantiate(providers[name], locals);
                } catch (e) {
                    if (cache[name] === INSTANTIATING) {
                        delete cache[name];
                    }

                    error = e;
                } finally {
                    stack.pop();
                }

                if (error) {
                    throw error;
                }

                return cache[name];
            }

            /**
             * @param {string} name
             * @return {boolean}
             */

        }, {
            key: 'has',
            value: function has(name) {
                return this.$cache.hasOwnProperty(name) || this.$providers.hasOwnProperty(name);
            }

            /**
             * Register a provider for a value meant to be a singleton instance
             * @param {string} name
             * @param {Function|Class} value
             */

        }, {
            key: 'provideShared',
            value: function provideShared(name, value) {
                return this.provide(name, value, true);
            }

            /**
             * Register a provider for a value meant to be recreated everytime it is required
             * @param {string} name
             * @param {Function|Class} value
             */

        }, {
            key: 'provideNotShared',
            value: function provideNotShared(name, value) {
                return this.provide(name, value, false);
            }

            /**
             * Register a provider for a value
             * @param {string} name
             * @param {Function|Class} value
             * @param {boolean} isShared
             */

        }, {
            key: 'provide',
            value: function provide(name, value) {
                var isShared = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

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
             * @param {string} name
             * @param {*} value
             */

        }, {
            key: 'constant',
            value: function constant(name, value) {
                if (this.$frozen) {
                    throw new Error(INJECTOR_FROZEN_ERROR);
                }

                this.$cache[name] = value;
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
                if (this.$providers.hasOwnProperty(name)) {
                    throw new Error('Cannot register a dependency that already exists: ' + name);
                }

                this.$providers[name] = this._annotateConstructor.apply(null, provider);

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
                this.$cache = {};
                this.$providers = {};
                this.$privates = {};
                this.$stack = [];
            }

            /**
             * @return {Injector}
             */

        }], [{
            key: 'create',
            value: function create() {
                return new Injector();
            }
        }]);
        return Injector;
    }();

    return Injector;

}));
//# sourceMappingURL=handbag.js.map
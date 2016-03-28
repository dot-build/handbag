const toString = Object.prototype.toString;
const INSTANTIATING = {};
const INJECTOR_FROZEN_ERROR = 'This injector is frozen and cannot be modified';

const is = {
    array: (value) => {
        return '[object Array]' === toString.call(value);
    },

    function: (value) => {
        return typeof value === 'function';
    },

    object: (value) => {
        return value !== null && typeof value === 'object';
    }
};

const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

/**
 * Dependency Injection container
 */
class Injector {
    constructor() {
        this._reset();
    }

    /**
     * @param {string} name
     * @param {Object} [locals]     Map of injectables to override
     */
    get(name, locals) {
        if (is.array(name)) {
            return name.map(function(item) {
                return this.get(item, locals);
            }, this);
        }

        if (name === 'handbag') {
            return this;
        }

        if (locals && locals.hasOwnProperty(name)) {
            return locals[name];
        }

        const cache = this.$cache;

        if (cache.hasOwnProperty(name) && cache[name] !== INSTANTIATING) {
            return cache[name];
        }

        const resource = this._getOrCreate(name, locals);

        if (true === this.$privates[name]) {
            delete cache[name];
        }

        // stack.pop();
        return resource;
    }

    /**
     * @private
     */
    _getOrCreate(name, locals) {
        const cache = this.$cache;
        const stack = this.$stack;
        const providers = this.$providers;

        let error;

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
    has(name) {
        return this.$cache.hasOwnProperty(name) || this.$providers.hasOwnProperty(name);
    }

    /**
     * Register a provider for a value meant to be a singleton instance
     * @param {string} name
     * @param {Function|Class} value
     */
    provideShared(name, value) {
        return this.provide(name, value, true);
    }

    /**
     * Register a provider for a value meant to be recreated everytime it is required
     * @param {string} name
     * @param {Function|Class} value
     */
    provideNotShared(name, value) {
        return this.provide(name, value, false);
    }

    /**
     * Register a provider for a value
     * @param {string} name
     * @param {Function|Class} value
     * @param {boolean} isShared
     */
    provide(name, value, isShared = true) {
        if (this.$frozen) {
            throw new Error(INJECTOR_FROZEN_ERROR);
        }

        if (is.array(value)) {
            let provider = value[value.length - 1];

            if (!is.function(provider)) {
                throw new Error('Invalid provider for ' + name);
            }

            this._register(name, value, isShared);

            return this;
        }

        if (is.function(value)) {
            let provider = this._parseDependencies(value);
            provider.push(value);
            this._register(name, provider, isShared);

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
    constant(name, value) {
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
    instantiate(Type, locals) {
        var Constructor = function() {},
            instance, returnedValue;

        Constructor.prototype = (is.array(Type) ? Type[Type.length - 1] : Type).prototype;

        instance = new Constructor();
        returnedValue = this.invoke(Type, instance, locals);
        instance = (is.object(returnedValue) || is.function(returnedValue)) ? returnedValue : instance;

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
    invoke(invokable, context, locals) {
        let _invokable;

        if (is.array(invokable)) {
            _invokable = this._getInvokableFromArray(invokable);
        } else if (is.function(invokable)) {
            _invokable = this._getInvokableFromFunction(invokable);
        }

        if (!(_invokable && _invokable.method)) {
            throw new Error('Invalid invokable value');
        }

        let { dependencies } = _invokable;

        if (dependencies.length) {
            dependencies = this.get(dependencies, locals);
        }

        return _invokable.method.apply(context || null, dependencies);
    }

    _getInvokableFromArray(array) {
        let dependencies = array.slice(0);
        let method = dependencies.pop();

        if (!is.function(method)) {
            method = null;
        }

        return { dependencies, method };
    }

    _getInvokableFromFunction(fn) {
        let dependencies = fn.$inject || this._parseDependencies(fn);

        return { dependencies, method: fn };
    }

    _annotateConstructor() {
        var args = Array.from(arguments),
            Constructor = args.pop();

        Constructor.$inject = args;

        return Constructor;
    }

    _parseDependencies(fn) {
        var match = fn.toString().match(FN_ARGS),
            fnArgs = match && match[1];

        return fnArgs && fnArgs.split(',').map(function(arg) {
            return arg.trim();
        }) || [];
    }

    _register(name, provider, isShared) {
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
    freeze() {
        this.$frozen = true;
    }

    /**
     * Reset all the values declared in this injector
     * @private
     */
    _reset() {
        this.$cache = {};
        this.$providers = {};
        this.$privates = {};
        this.$stack = [];
    }

    /**
     * @return {Injector}
     */
    static create() {
        return new Injector();
    }
}

export default Injector;

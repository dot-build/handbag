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
     * @param {string|Symbol} name
     * @param {Object} [locals={}]     Map of injectables to override
     */
    get(name, locals = {}) {
        if (is.array(name)) {
            return name.map(function(item) {
                return this.get(item, locals);
            }, this);
        }

        if (name === 'handbag') {
            return this;
        }

        let isInLocals = locals.hasOwnProperty(name);
        if (!isInLocals && typeof locals.getOwnPropertySymbols === 'function') {
            isInLocals = locals.getOwnPropertySymbols().indexOf(name) !== -1;
        }

        if (isInLocals) {
            return locals[name];
        }

        const stack = this.$stack;

        if (!this.has(name)) {
            let error = 'Dependency not found: ' + name +
                (stack.length ? ' (' + stack.join(' <- ') + ')' : '');

            throw new Error(error);
        }

        return this._getResource(name, locals);
    }

    /**
     * @param {string|Symbol} name
     * @param {Object} [locals]     Map of injectables to override
     */
    _getResource(name, locals) {
        if (this.hasLocalProvider(name)) {
            return this.getOrCreate(name, locals);
        }

        const injector = this.$children.find(i => i.hasLocalProvider(name));
        return injector.getOrCreate(name, locals);
    }

    /**
     * Get a value from cache or instantiate a value from registered provider
     * @param {string|Symbol} name
     * @param {Object} [locals]     Map of injectables to override
     * @private
     */
    getOrCreate(name, locals) {
        const cache = this.$cache;
        const stack = this.$stack;
        const providers = this.$providers;

        if (cache.has(name) && !this._isInstantiating(name)) {
            return cache.get(name);
        }

        let error, value;
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

        console.log(name, value);

        return value;
    }

    _isInstantiating(name) {
        return this.$cache.get(name) === INSTANTIATING;
    }

    /**
     * Check for a provider in this injector and all children
     * @param {string|Symbol} name
     * @return {boolean}
     */
    has(name) {
        return this.hasLocalProvider(name) || this.hasChildProvider(name);
    }

    /**
     * Check for a provider only in this instance (not checking on children)
     * @param {string|Symbol} name
     * @return {boolean}
     */
    hasLocalProvider(name) {
        let v = this.$cache.has(name) || this.$providers.has(name);
        return v;
    }

    /**
     * Check for a provider in all children injectors
     * @param {string|Symbol} name
     * @return {boolean}
     */
    hasChildProvider(name) {
        var v= Boolean(this.$children.find(i => i.hasLocalProvider(name)));
        return v;
    }

    /**
     * Register a provider for a value meant to be a singleton instance
     * @param {string|Symbol} name
     * @param {Function|Class} value
     */
    provideShared(name, value) {
        return this.provide(name, value, true);
    }

    /**
     * Register a provider for a value meant to be recreated everytime it is required
     * @param {string|Symbol} name
     * @param {Function|Class} value
     */
    provideNotShared(name, value) {
        return this.provide(name, value, false);
    }

    /**
     * Register a provider for a value
     * @param {string|Symbol} name
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
     * @param {string|Symbol} name
     * @param {*} value
     */
    constant(name, value) {
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
        if (this.$providers.has(name)) {
            throw new Error('Cannot register a dependency that already exists: ' + name);
        }

        const value = this._annotateConstructor.apply(null, provider);
        this.$providers.set(name, value);

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
        this.$cache = new Map();
        this.$providers = new Map();
        this.$privates = {};
        this.$stack = [];
        this.$children = [];
    }

    /**
     * @param {Injector} injector
     */
    addInjector(injector) {
        this.$children.push(injector);
    }

    /**
     * @return {Injector}
     */
    static createInjector() {
        return new Injector();
    }
}

export default Injector;

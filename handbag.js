(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.handbag = factory();
	}
}(this, function() {
	'use strict';

	var toString = Object.prototype.toString,
		INSTANTIATING = {},

		is = {
			array: function(value) {
				return '[object Array]' === toString.call(value);
			},

			function: function(value) {
				return typeof value === 'function';
			},

			object: function(value) {
				return value !== null && typeof value === 'object';
			}
		};

	function Injector() {
		this.reset();
	}

	Injector.prototype = {
		constructor: Injector,

		get: function(name, locals) {
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

			var cache = this.$cache,
				stack = this.$stack;

			if (cache.hasOwnProperty(name)) {
				return cache[name];
			}

			stack.push(name);

			if (!this.$providers.hasOwnProperty(name)) {
				throw new DependencyNotFoundError(stack.join(' <- '));
			}

			if (cache[name] === INSTANTIATING) {
				throw new CircularDependencyError(stack.join(' <- '));
			}

			try {
				cache[name] = INSTANTIATING;
				cache[name] = this.instantiate(this.$providers[name], locals);
			} catch (e) {
				if (cache[name] === INSTANTIATING) {
					delete cache[name];
				}
				stack.pop();

				throw e;
			}

			var resource = cache[name];

			if (true === this.$privates[name]) {
				delete cache[name];
			}

			stack.pop();
			return resource;
		},

		has: function(name) {
			return this.$providers.hasOwnProperty(name);
		},

		instantiate: function(Type, locals) {
			var Constructor = function() {},
				instance, returnedValue;

			Constructor.prototype = (is.array(Type) ? Type[Type.length - 1] : Type).prototype;

			instance = new Constructor();
			returnedValue = this.invoke(Type, instance, locals);
			instance = (is.object(returnedValue) || is.function(returnedValue)) ? returnedValue : instance;

			return instance;
		},

		invoke: function(invokable, self, locals) {
			var dependencies, method, args = [];

			if (is.array(invokable)) {
				dependencies = invokable.slice(0);
				method = dependencies.pop();
			} else {
				if (!('$inject' in invokable)) {
					dependencies = this.parseDependencies(invokable);
				} else {
					dependencies = invokable.$inject;
				}

				method = invokable;
			}

			if (dependencies.length) {
				args = this.get(dependencies, locals);
			}

			return method.apply(self, args);
		},

		annotate: function() {
			var args = Array.prototype.slice.call(arguments),
				fn = args.pop();

			fn.$inject = args;

			return fn;
		},

		parseDependencies: (function() {
			var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

			return function(fn) {
				if (!is.function(fn)) {
					throw new Error('Invalid function: ' + fn);
				}

				var match = fn.toString().match(FN_ARGS),
					fnArgs = match[1];

				return fnArgs && fnArgs.split(',').map(function(arg) {
					return arg.trim();
				}) || [];
			};
		}()),

		provide: function(name, value, isPrivate) {
			if (this.$frozen) {
				throw new InjectorIsFrozenError();
			}

			var provider;

			if (is.array(value)) {
				provider = value;
			} else if (is.function(value)) {
				provider = this.parseDependencies(value);
				provider.push(value);
			} else {
				this.value(name, value);
			}

			if (provider) {
				if (this.$providers.hasOwnProperty(name)) {
					throw new DependencyAlreadyExistsError(name);
				}

				this.$providers[name] = this.annotate.apply(null, provider);
				if (isPrivate) {
					this.$privates[name] = true;
				}
			}

			return this;
		},

		value: function(name, value) {
			if (this.$frozen) {
				throw new InjectorIsFrozenError();
			}

			this.$cache[name] = value;
			return this;
		},

		freeze: function() {
			this.$frozen = true;
		},

		reset: function() {
			if (this.$frozen) {
				throw new InjectorIsFrozenError();
			}

			this.$cache = {};
			this.$providers = {};
			this.$privates = {};
			this.$stack = [];
		}
	};

	function createError(name, message) {
		function CustomError(cause) {
			var err = new Error();
			err.name = name;
			err.message = message.replace('%s', cause);
			return err;
		}

		return CustomError;
	}

	var DependencyNotFoundError = createError('DependencyNotFoundError', 'Dependency not found: %s');
	var DependencyAlreadyExistsError = createError('DependencyAlreadyExistsError', 'Cannot register, dependency already exists: %s');
	var CircularDependencyError = createError('CircularDependencyError', 'Circular dependency found: %s');
	var InjectorIsFrozenError = createError('InjectorIsFrozenError', 'This injector is frozen and cannot be modified');

	var injector = new Injector();
	injector.createInjector = function() {
		return new Injector();
	};

	return injector;
}));

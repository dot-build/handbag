/* globals handbag */
describe('handbag', function() {
    let injector;

    beforeEach(function () {
        injector = handbag.createInjector();
    });

    describe('#constructor()', function() {
        it('should throw error', function () {
            expect(handbag).toThrow();
        });
    });

    describe('#has(name)', function() {
        it('should return true', function () {
            injector.constant('NAME', 'value');
            expect(injector.has('NAME')).toBe(true);
        });

        it('should return false', function () {
            expect(injector.has('NAME')).toBe(false);
        });
    });

    describe('#constant(name, value)', function() {
        it('should declare a constant value', function () {
            injector.constant('FOO', 1);
            expect(injector.has('FOO')).toBe(true);
            expect(injector.get('FOO')).toBe(1);
        });
    });

    describe('#provide(name, Type, isShared = true)', function() {
        it('should register a shared provider by default', function () {
            function Foo() {}

            injector.provide('Foo', Foo);

            expect(injector.has('Foo')).toBe(true);

            let foo = injector.get('Foo');
            let bar = injector.get('Foo');

            expect(foo).toBe(bar);
        });

        it('should parse construction arguments', function () {
            function Foo(BAR) {
                this.bar = BAR;
            }

            injector.provide('Foo', Foo);
            let instance = injector.get('Foo', { BAR : 1 });

            // should parse the BAR argument correctly
            expect(instance.bar).toBe(1);
        });

        it('should accept array notation for a provider', function () {
            function Foo(BAR) {
                this.bar = BAR;
            }

            injector.provide('Foo', ['BAR', Foo]);
            injector.provide('BAR', 2);

            let instance = injector.get('Foo');

            // should parse the BAR argument correctly
            expect(instance.bar).toBe(2);
        });

        it('should throw an error if the provider constructor is not valid', function () {
            function test() {
                injector.provide('Foo', []);
            }

            expect(test).toThrow();
        });

        it('should throw an error if a provider is registered twice', function () {
            function test() {
                function Foo() {}
                injector.provide('Foo', Foo);
                injector.provide('Foo', Foo);
            }

            expect(test).toThrow(new Error('Cannot register a dependency that already exists: Foo'));
        });
    });

    describe('#provideShared', function() {
        it('should register a shared provider', function () {
            function Foo() {}

            let spy = spyOn(injector, 'provide');
            injector.provideShared('Foo', Foo);

            expect(spy).toHaveBeenCalledWith('Foo', Foo, true);
        });
    });

    describe('#invoke(invokable, context, locals)', function() {
        it('should invoke a function into a context with the right dependencies', function () {
            function Foo(BAR, baz) {
                this.foo = BAR - baz;
            }

            const BAR = 3;
            const locals = { baz: 1 };
            const context = { foo: 10 };

            injector.constant('BAR', BAR);
            // invokes Foo pointing "this" to context and having BAR = 3 and baz = 1
            injector.invoke(Foo, context, locals);

            expect(context.foo).toBe(2);
        });

        it('should accept an array as invokable value', function () {
            function Foo(BAR) {
                this.bar = BAR;
            }

            const context = {};

            injector.constant('BAR', 1);
            injector.invoke(['BAR', Foo], context);

            expect(context.bar).toBe(1);
        });

        it('should throw an error if invokable is not valid', function () {
            function test() {
                injector.invoke(['Foo']);
            }

            expect(test).toThrow();
        });
    });

    describe('#provideNotShared', function() {
        it('should register a non shared provider', function () {
            function Foo() {}

            let spy = spyOn(injector, 'provide');
            injector.provideNotShared('Foo', Foo);

            expect(spy).toHaveBeenCalledWith('Foo', Foo, false);
        });
    });

    describe('#get(name, locals)', function() {
        it('should return a configured and instantiated dependency from container', function () {
            var BAR = 2;
            function Foo(BAR) {
                this.bar = BAR;
            }

            injector.provide('Foo', Foo);
            injector.constant('BAR', BAR);

            let foo = injector.get('Foo');
            let bar = injector.get('Foo');

            expect(foo.bar).toBe(BAR);
            expect(bar).toBe(foo);
        });

        it('should always return itself if injected token name is "handbag"', function () {
            expect(injector.get('handbag')).toBe(injector);
        });

        it('should throw error if a dependency is not found', function () {
            function test() {
                injector.get('INVALID');
            }

            expect(test).toThrow(new Error('Dependency not found: INVALID'));
        });

        it('should throw error if a circular dependency is found', function () {
            function Foo(Bar) { return Bar; }
            function Bar(Foo) { return Foo; }

            injector.provide('Bar', Bar);
            injector.provide('Foo', Foo);

            function test() {
                injector.get('Bar');
            }

            expect(test).toThrow(new Error('Circular dependency found: Bar <- Foo <- Bar'));

            // running again should have the same result, i.e. the stack should be cleaned up
            expect(test).toThrow(new Error('Circular dependency found: Bar <- Foo <- Bar'));
        });

        it('should allow to re-execute providers if they are marked as "not shared"', function () {
            function Foo() {}
            injector.provideNotShared('Foo', Foo);

            let a = injector.get('Foo');
            let b = injector.get('Foo');

            expect(a).not.toBe(b);
        });

        it('should allow to get values using Symbol tokens', function () {
            let token = Symbol('foo');
            function Foo() {}

            injector.provide(token, Foo);

            let foo = injector.get(token);

            expect(foo instanceof Foo).toBe(true);
        });
    });

    describe('#instantiate(Type, locals)', function() {
        it('should instantiate a Type constructor', function () {
            var FOO = 'foo';

            function User(FOO, data) {
                this.foo = FOO;
                this.data = data;
            }

            injector.provide('User', User, true);
            injector.constant('FOO', FOO);

            let data = { id: 1 };
            let user = injector.instantiate(User, { data });

            expect(user instanceof User).toBe(true);
            expect(user.foo).toBe(FOO);
            expect(user.data).toBe(data);
        });

        it('should instantiate a Type constructor with array notation', function () {
            var FOO = 'foo';

            function User(FOO, data) {
                this.foo = FOO;
                this.data = data;
            }

            injector.provide('User', User, true);
            injector.constant('FOO', FOO);

            let data = { id: 1 };
            let user = injector.instantiate(['FOO', 'data', User], { data });

            expect(user instanceof User).toBe(true);
            expect(user.foo).toBe(FOO);
            expect(user.data).toBe(data);
        });
    });

    describe('#freeze()', function() {
        it('should lock the injector from further provider additions', function () {
            injector.freeze();

            function test() {
                injector.provide('FOO', function() {});
            }

            expect(test).toThrow();
        });

        it('should lock the injector from constant declarations', function () {
            injector.freeze();

            function test() {
                injector.constant('FOO', 1);
            }

            expect(test).toThrow();
        });
    });

    describe('#addInjector(injector)', function() {
        it('should allow to add a child injector in an instance and pull values from it', function () {
            const foo = handbag.createInjector();
            const bar = handbag.createInjector();

            function Bar() {}
            bar.constant('BAR', 123);
            bar.provide('BarService', Bar);

            foo.addInjector(bar);

            let BAR = foo.get('BAR');
            let BarService = foo.get('BarService');

            // pulled from bar though foo injector
            expect(BAR).toBe(123);
            expect(BarService instanceof Bar).toBe(true);
        });
    });
});

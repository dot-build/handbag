var handbag = require('./handbag'),
	isOK = true,
	error1, error2;

function assert(value) {
	isOK = isOK && value;
}

assert(handbag.get('handbag') === handbag);

handbag.provide('Bar', ['FOO', 'handbag',
	function(FOO, hb) {
		this.name = 'Bar';
		return this;
	}
]);

handbag.value('FOO', 'foo');

handbag.provide('Foo', function() {
	return {
		name: 'Foo'
	};
});


var Bar = handbag.get('Bar'),
	Foo = handbag.get('Foo');

assert(Bar.name === 'Bar');
assert(Foo.name === 'Foo');

handbag.provide('PrivateBar', ['Baz',
	function(Baz) {
		return {
			name: 'PrivateBar',
			Baz: Baz
		};
	}
], true);

var PrivateBar = handbag.get('PrivateBar', {
	Baz: 'baz'
});

assert(PrivateBar.name === 'PrivateBar', PrivateBar.Baz);

try {
	handbag.get('PrivateBar');
} catch (e) {
	error = e;
}

assert(typeof error === 'object');

console.log('isOK: ', isOK);

process.exit(isOK ? 0 : 1);
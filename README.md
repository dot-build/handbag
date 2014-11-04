# handbag

Dependency Injector - Inspired on AngularJS (without the config stage)

This is just an experiment to understand how dependency injection was
made for AngularJS framework

Code explains it better

```javascript
var handbag = require('handbag');

handbag.provide('Bar', ['FOO', 'handbag', function(FOO, hb) {
	// always true
	console.log(hb.get('handbag') === hb, FOO);
}]);

handbag.value('FOO', 'foo');

// true, "foo"
handbag.get('Bar');

```

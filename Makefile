test:
	./node_modules/karma/bin/karma start karma.conf.js --single-run

tdd:
	./node_modules/karma/bin/karma start karma.conf.js

build:
	./node_modules/.bin/gulp build

watch:
	./node_modules/.bin/gulp watch

bundle:
	BUNDLE=1 ./node_modules/.bin/gulp build

docs:
	rm -rf docs;\
	./node_modules/.bin/esdoc -c esdoc.json;

.PHONY: test tdd build watch bundle docs
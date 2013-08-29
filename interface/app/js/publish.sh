#!/bin/bash

APPBASE='/home/mlarosa/src/eac-viewer/interface/app'

# build the angular js files
for TGT in controllers services directives filters; do
    rm "../lib/${TGT}.js" && touch "../lib/${TGT}.js"
    for n in $(ls $TGT); do
        cat $TGT/$n >> "../lib/${TGT}.js"
    done
done

# build the js file
#JS="jquery-1.9.1.min.js bootstrap.min.js angular-1.1.5/angular.min.js spin.min.js \
JS="angular/angular.min.js ui-bootstrap-tpls-0.5.0.min.js spin.min.js \
d3.v3.min.js services.js controllers.js filters.js directives.js"

JSFILE="lib.js"
rm ../$JSFILE && touch ../$JSFILE

for js in $JS ; do
        cat "../lib/$js" >> ../$JSFILE
        done
        cat app.js >> ../$JSFILE

# publish the code
#rsync -av $APPBASE/ /srv/dev01.esrc.info/
#rsync -av $APPBASE/ /var/www/
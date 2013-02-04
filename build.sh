VERSION=0.2
w=src/activetable/widgets

#drop dist directory
rm -fr dist
mkdir dist

#Table base
cat src/activetable/data.js src/activetable/table.js | java -jar yuicompressor-2.4.2.jar --type js >> dist/active-table-$VERSION.js
cat src/activetable/skin/we/table.css| java -jar yuicompressor-2.4.2.jar --type css >> dist/skin/we/active-table-$VERSION.css

#Widgets
cat $w/actionButtons/actionButtons.js $w/actionButtons/actionButtons.tpl.js| java -jar yuicompressor-2.4.2.jar >> dist/active-table-$VERSION-widgets.js
cat $w/actionButtons/actionButtons.css | java -jar yuicompressor-2.4.2.jar --type css >> dist/active-table-0.1-widgets.css
cat $w/perPage/perPage.js $w/perPage/perPage.tpl.js| java -jar yuicompressor-2.4.2.jar >> dist/active-table-$VERSION-widgets.js 
cat $w/saveButtons/saveButtons.js $w/saveButtons/saveButtons.tpl.js| java -jar yuicompressor-2.4.2.jar >> dist/active-table-$VERSION-widgets.js 
cat $w/saveButtons/saveButtons.css | java -jar yuicompressor-2.4.2.jar --type css >> dist/active-table-0.1-widgets.css

#Skins
cp -r src/activetable/skin dist/skin

echo "Build done. see dist directory. See ya!"

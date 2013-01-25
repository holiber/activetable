VERSION=0.1

#drop dist directory
rm -fr dist
mkdir dist

#Table base
cat src/activeTable/data.js src/activeTable/table.js src/activeTable/table.tpl.js| java -jar yuicompressor-2.4.2.jar --type js >> dist/active-table-$VERSION.js
cat src/activeTable/table.css| java -jar yuicompressor-2.4.2.jar --type css >> dist/active-table-0.1.css

#Widgets
w='src/activeTable/widgets'
cat $w/actionButtons/actionButtons.js $w/actionButtons/actionButtons.tpl.js| java -jar yuicompressor-2.4.2.jar --type js  >> dist/active-table-$VERSION-widgets.js
cat $w/actionButtons/actionButtons.css | java -jar yuicompressor-2.4.2.jar --type css >> dist/active-table-0.1-widgets.css
cat $w/perPage/perPage.js $w/perPage/perPage.tpl.js| java -jar yuicompressor-2.4.2.jar --type js >> dist/active-table-$VERSION-widgets.js 
cat $w/saveButtons/saveButtons.js $w/saveButtons/saveButtons.tpl.js| java -jar yuicompressor-2.4.2.jar --type js >> dist/active-table-$VERSION-widgets.js 
cat $w/saveButtons/saveButtons.css | java -jar yuicompressor-2.4.2.jar --type css >> dist/active-table-0.1-widgets.css

#Images
cp src/activeTable/icons.png dist/icons.png

echo "Build done. see dist directory. See ya!"


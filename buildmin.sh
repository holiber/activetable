
#Increment active table version here
VERSION=0.4

#drop dist directory
rm -fr dist
mkdir dist
p=`pwd`

test()
{
	echo "Argument 1 is $1"
}

pack ()
{
	cd $p
	cmd=$1
	cmdcss=$2
	todir=$3
	SUFFIX=$4
	mkdir -p dist/$todir
	#core table functions
	cd src/activetable
	
	cat data.js table.js | $cmd >> $p/dist/$todir/active-table-$VERSION$SUFFIX.js
	mkdir -p $p/dist/$todir/skin/we/
	cat skin/we/table.css | $cmdcss >> $p/dist/$todir/skin/we/active-table-$VERSION$SUFFIX.css
	#table widgets
	cd widgets
	cat actionButtons/actionButtons.js actionButtons/actionButtons.tpl.js| $cmd >> $p/dist/$todir/active-table-widgets-$VERSION$SUFFIX.js
	cat actionButtons/actionButtons.css | $cmdcss >> $p/dist/$todir/active-table-widgets-$VERSION$SUFFIX.css
	cat perPage/perPage.js perPage/perPage.tpl.js| $cmd >> $p/dist/$todir/active-table-widgets-$VERSION$SUFFIX.js 
	cat saveButtons/saveButtons.js saveButtons/saveButtons.tpl.js| $cmdcss >> $p/dist/$todir/active-table-widgets-$VERSION$SUFFIX.js 
	cat saveButtons/saveButtons.css | $cmdcss >> $p/dist/$todir/active-table-widgets-$VERSION$SUFFIX.css
	cp $p/src/activetable/skin/we/icons.png $p/dist/$todir/skin/we/icons.png
}

comp="java -jar $p/yuicompressor-2.4.2.jar"
pack "$comp --type js" "$comp --type css" 'min' '.min'
pack 'tee' 'tee' 'dev' ''

echo "Build done. see dist directory. See ya!"
(function (scope) {

	var IS_TAG_RE = /^[\.#%].*?/;

	var FASTCLOSING_TAGS = ['br','input'];

	var StringBuilder = function () {
		this.lines = [];
	};
	StringBuilder.prototype.append = function (val) {
		this.lines.push(val);
		return this;
	};
	StringBuilder.prototype.toString = function () {
		return this.lines.join('');
	};

	function elem(e, builder) {
		if (!e) {
			if( e == 0 )
				builder.append('0');
			else {
				builder.append('');
			}
		} else if (e.constructor === String || e.constructor === Number) {
			builder.append(e);
		} else if (e.constructor === Array) {
			arrayElem(e, builder);
		} else {
			throw new Error('Improper node type');
		}
	}

	function arrayElem(elem, builder) {
		var hasAttrs, t, e0;
		if (!elem.length) {
			return '';
		}
		e0 = elem[0].constructor;
		if (e0 === String && IS_TAG_RE.test(elem[0])) {
			// is tag?
			hasAttrs = elem[1] && elem[1].constructor === Object;
			t = tag(elem[0], hasAttrs ? elem[1] : null);
			if(t.length===1) {
				// empty tag?
				builder.append(t[0]);
			} else if(t.length===2) {
				builder.append(t[0]);
				childs(elem, hasAttrs ? 2 : 1, builder);
				builder.append(t[1]);
			} else {
				throw "No tag data!";
			}
		} else {
			childs(elem, 0, builder);
		}
	}

	function childs(array, startFrom, builder) {
		for (var i = startFrom, len = array.length; i < len; i++) {
			elem(array[i], builder);
		}
	}

	function inArray(elem,array){
		var i,found=-1;
		for(i=0;i<array.length;i++) {
			if(array[i]===elem){
				found = i;
				break;
			}
		}
		return found;
	}



	function tag(type, attrs) {
		var tm = type.match(/^%([^\.#]*)/), tg = tm && tm[1] ? tm[1] : 'div',
			cm = type.match(/\.([a-zA-Z_\-0-9\.]*)/), cls = cm && cm[1] ? cm[1] : null,
			idm = type.match(/#([a-zA-Z_\-0-9]*)/), id = idm && idm[1] ? idm[1] : null,
			attrstr = '', attrvalue,
			open,close,isFastClosed = (inArray(tg, FASTCLOSING_TAGS) !== -1),result;
		if (attrs) {
			for (var k in attrs) {
				attrvalue = attrs[k].constructor === String ?
					'"' + attrs[k] + '"' : attrs[k];
				attrstr += k + '=' + attrvalue + ' ';
			}
			attrstr.length && (attrstr = attrstr.substr(0, attrstr.length - 1));
		}
		open = '<' + tg +
				( id ? ' id="' + id + '"' : '') +
				( cls ? ' class="' + cls.replace(/\./ig, ' ') + '"' : '') +
				( attrstr.length ? ' ' + attrstr : '' );
		close = '</' + tg + '>';

		if(isFastClosed){
			open += '/>';
			result = [open];
		} else {
			open += '>';
			result = [open, close];
		}
		return result;
	}


	scope.Haml = {
		toHtml:function (tpl) {
			var sb = new StringBuilder();
			elem(tpl, sb);
			return sb.toString();
		}
	};

})(window);


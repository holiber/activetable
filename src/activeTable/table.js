/**
 * v0.2.2
 * Available via the MIT license.
 * see: http://github.com/holiber/activetable
 */
;(function (context) {

	var ARROWS_BS_DEL = [37,39,8,46],
		DIGIT_BOUNDS = [48,57];

	var DEFAULT_OPTIONS = {
		data: null,
		name: 'unnamed',
		templates: null,
		selectable: false,
		perPage: 20,
		fields: null,
		order: [],
		hiddenFields: ['idx'],
		showOnlyDescribed: false,
		sort: false,
		scrollParams: {
			vscroll: false,
			hscroll: false,
			vAcceleration: 10,
			hAcceleration: 10,
			autoSizing: true,
			vPos: 0,
			hPos: 0
		},
		widgets: {},
		widgetsOrder: [],
		helper: {},
		resizeThrottle: 500,
		fieldsDefaults: {
			sortable: true,
			editable: false,
			compute: false,
			type: false,
			fixedWidth: false,
			hint: false,
			saveChange: true,
			defaultValue: undefined,
			validation: undefined,
			maxValue: undefined,
			minValue: undefined,
			title: undefined, //function (field) { return field.name}
			display: undefined//display: function (tplParams) {}
		},
		on: {}
	};


	var Class = Qstore.Class;
	/**
	 * Haml templater by alxgutnikov
	 */
	var Haml = (function() {

		var IS_TAG_RE = /^[\.#%].*?/;

		var StringBuilder = function(){
			this.lines = [];
		};
		StringBuilder.prototype.append = function( val ){
			this.lines.push(val);
			return this;
		};
		StringBuilder.prototype.toString = function(){
			return this.lines.join('');
		};

		function elem( elem, builder ){
			if(elem === undefined || elem == null){
				builder.append('');
			} else if( elem.constructor === String || elem.constructor === Number ){
				builder.append( elem );
			} else if( elem.constructor === Array ) {
				arrayElem( elem,builder );
			} else if( elem.constructor === Function ){
				builder.append(elem.toString());
			}
		}

		function arrayElem( elem, builder ){
			var hasAttrs, t,e0;
			if( !elem.length ){
				return '';
			}
			e0 = elem[0] && elem[0].constructor;
			if( e0 === String && IS_TAG_RE.test(elem[0])){
				// is tag?
				hasAttrs = elem[1] && elem[1].constructor === Object;
				t = tag(elem[0], hasAttrs ? elem[1] : null );
				builder.append(t[0]);
				childs( elem, hasAttrs ? 2 : 1, builder );
				builder.append(t[1]);
			} else {
				childs(elem, 0, builder);
			}
		}


		function childs( array, startFrom, builder ){
			for( var i = startFrom, len = array.length;i < len; i++ ){
				elem(array[i], builder);
			}
		}

		function tag( type, attrs ){
			var tm = type.match(/^%([^\.#]*)/),
				tg = tm && tm[1] ? tm[1] : 'div',
				cm = type.match(/\.([a-zA-Z_\-0-9\.]*)/),
				cls = cm && cm[1] ? cm[1] : null,
				idm = type.match(/#([a-zA-Z_\-0-9]*)/),
				id = idm && idm[1] ? idm[1] : null,
				attrstr = '',
				attrvalue;

			if( attrs ){
				for( var k in attrs ){
					if( attrs[k]){
						attrvalue = attrs[k].constructor === String ?
							'"' + attrs[k] + '"' : attrs[k];
						attrstr += k + '=' + attrvalue + ' ';
					}
				}
				attrstr.length && (attrstr = attrstr.substr(0, attrstr.length - 1));
			}
			return [
				'<' + tg +
					( id ? ' id="' + id + '"' : '') +
					( cls ? ' class="' + cls.replace(/\./ig,' ') + '"' : '') +
					( attrstr.length ? ' ' + attrstr : '' )+ ">",
				'</' + tg + '>'
			];
		}


		var Haml = {
			toHtml: function( tpl ){
				var sb = new StringBuilder();
				elem(tpl, sb);
				return sb.toString();
			}
		};

		return Haml;
	})();


	var tableUtils = {
		/**
		* @return {Number} object fields count
		*/
		length: function (obj) {
			var cnt = 0;
			if ($.isArray(obj)) return obj.length;
			for (var key in obj) cnt++;
			return cnt;
		},

		/**
		* convert camelCase string to under_score
		* @param {String} str
		* @return {String}
		*/
		toUnderscore: function (str) {
			if (!str) return '';
			return str.replace(/([A-Z])/g, function (str, p1) { return '_' + p1.toLowerCase()});
		},

		/**
		* convert camelCase string to -score
		* @param {String} str
		* @return {String}
		*/
		toScore: function (str) {
			if (!str) return '';
			str = str.replace(/([A-Z])/g, function (str, p1, offset) { return (offset != 0 ? '-' : '') + p1.toLowerCase()});
			str = str.replace(/(_)/g, '-');
			return str;
		},

		/**
		 * format number as "999 999"
		 * @param {String|Number} number
		 * @return
		 */
		toFormatedNumber: function (number) {
			if (number === 0) return '0';
			if (!number) return '';
			return String(number).replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ');
		},

		tocamelCase: function (str) {
			if (!str) return '';
			str = str.replace(/([A-Z])/g, function (str, p1, offset) { return offset != 0 ? p1.toUpperCase() : p1.toLowerCase()});
			str = str.replace(/(_)/g, '');
			str = str.replace(/(-)/g, '');
			return str;
		},

		/**
		* converts date to "dd.mm.yyyy" format
		* @param {Date|Number} date
		* @return string
		**/
		dateToSting: function (date) {
			if (!date) return '';
			if (!(date instanceof Date)) date = new Date(date);
			var dd = String(date.getDate());
			if (dd < 10) dd = '0' + dd;
			var mm = String(date.getMonth() + 1);
			if (mm < 10) mm = '0' + mm;
			var yyyy = String(date.getFullYear());
			return (dd + '.' + mm + '.' + yyyy);
		}
	};
	
	/**
	 * Widget class
	 * @abstract
	 */
	var Widget = Class.extend({
	
		init: function (table, params) {
			this.table = table;
			this.target = null;//render place
			this.name = (params && params.name) || tableUtils.tocamelCase(this.componentName);
			this.el = null;
			this.enabled = true;
		},

		/**
		 * @param {String} eventName
		 */
		emit: function (eventName) {
			if (this.on && this.on[eventName]) {
				var args = Array.prototype.slice.call(arguments, 1);
				args.unshift(this);
				this.on[eventName].apply(this, args);
			}
		},

		/**
		 * disable widget
		 */
		disable: function () {
			this.enabled = false;
			this.el && this.el.off('.' + this.name);
		},

		/**
		 * enable widget
		 */
		enable: function () {
			this.enabled = true;
			this._attachEvents();
		},

		/**
		 * attach DOM events
		 * @private
		 */
		_attachEvents: function () {
			this.el && this.el.off('.' + this.name);
		},

		/**
		 * @param {String} eventName
		 * @param data
		 */
		_receive: function (eventName, data) {
			switch (eventName) {
				case 'disable': this.disable(); break;
				case 'enable': this.enable(); break;
			}
		},
		
		_static: {
			installTemplate: function (templates) {
				this.prototype.tpl = templates;
			}
		}

	});
	

	/**
	 * ActiveTable class
	 * WARNING! table does not render automatically when data changing,
	 * user "render" method for it
	 * @see render
	 */
	var ActiveTable = context.ActiveTable = Class.extend({

		defaultTemplates: null,
		utils: tableUtils,

		init: function (options) {
			this.el = null; //container
			this.layout = null; //container for drawing in document fragment
			this.jqWidgets = null; //widgets container
			this.templates = null; //a set of templates
			this.name = null; //table name, used to store some table options in cookies
			this.data = null; //instanse of Qstore
			this.visibleFields = []; //store list of all visible fields
			this.showOnlyDescribed = false; //show only fields described in "order" and "fields"
			this.fields = null; //store all table fields
			this.perPage = null; //how many records will be displayed on one page
			this.fixedRowsCnt = false;//always show fixed rows count specified in "perPage"
			this.page = 1; //store current page
			this.sort = null; //store stort array
			this.defaultSort = false; //3rd sorting state
			this.filters = {defaultFilter: null}; //store all applied table filters
			this.computedFilter = null; //computed filter based on all applied filters
			this.rowsCnt = null; //the number of visible fields based filtering
			this.widgets = null; //store all widgets instanses
			this.widgetsOrder = null;//store widgets order
			this.selection = []; //array of indexes of selected elements
			this._checkAll = false; //true when all elements are selected
			this.on = null; //external event handlers
			this.canSelectText = true; //use enableTextSelection() and disableTextSelection() to change this option
			this.cssClasses = [] //contains custom css-classes for table
			this.scrollParams = {
				vertical: false,
				horizontal: false,
				vPos: 0,
				hPos: 0,
				vAcceleration: null,
				hAcceleration: null,
				overflowHeight: 0,
				layerHeight: 0,
				overflowWidth: 0,
				layerWidth: 0,
				autoSizing: true,
				isVscrolling: false,
				isHscrolling: false,
				vBarOffsetY: 0,
				hBarOffsetX: 0,
				hScrollActive: false,
				vScrollActive: false
			};
			this.locked = false;
			this.enabled = true;
			this.clientX = null;
			this.clientY = null;
			this.lastCheckedIdx = null;
			this.resizeThrottle = 0;
			this.resizeTimeoutId = null;
			this._setOptions(options);
		},

		_setOptions: function (options) {
			options = options || {};
			this.params = this.params || {};
			this.params = $.extend(true, {}, DEFAULT_OPTIONS, this.params, options);
			this.fields = {};
			this.fieldsDefaults = this.params.fieldsDefaults;
			this.hiddenFields = this.params.hiddenFields;
			this.order = this.params.order;
			this.name = this.params.name;
			this.defaultSort = this.params.defaultSort;
			this.selectable = this.params.selectable;
			this.fixedRowsCnt = this.params.fixedRowsCnt;
			this.perPage = this.params.perPage;
			this.on = this.params.on;
			this.sort = this.params.sort;
			this.helper = this.params.helper;
			this.hasFooter = this.params.hasFooter;
			this.widgetsOrder = options.widgetsOrder || this.widgetsOrder || this.params.widgetsOrder;
			this.showOnlyDescribed = this.params.showOnlyDescribed;
			this.resizeThrottle = this.params.resizeThrottle;
			this.el = this.params.el;
			this.scrollParams = $.extend({}, DEFAULT_OPTIONS.scrollParams, this.params.scrollParams);

			this.setData(this.params.data);
			this.setFields(this.params.fields);
			this.setTemplates(this.params.templates);

			this.rowsCnt = this.data.size();
			if (this.params.sort || this.sort) this.data.sort(this.params.sort || this.sort);

			//init widgets
			this.widgets = {};
			for (var key in this.params.widgets) {
				var params = this.params.widgets[key];
				var widget = null;
				if (typeof(params) == 'string') {
					params = this.params.widgets[key] = {widget: params};
				}
				
				//if default widget exist
				if (ActiveTable.widgetsSet[params.widget]) {
					var Widget = ActiveTable.widgetsSet[params.widget];
					widget = new Widget(this, params.params);
				} else if ($.isFunction(params)){
					widget = new params(this);
				} else {
					throw 'widget ' + params.widget +' not found';
				}

				//attach events
				widget.on = {
					filter: this._onFilterHandler.bind(this),
					perPage: this._onPerPageHandler.bind(this),
					clearSelection: this._onClearSelectionHandler.bind(this),
					commit: this._onCommitHandler.bind(this),
					rollback: this._onRollbackHandler.bind(this)
				};
				this.widgets[params.widget] = widget;
			
			}
			for (var widgetName in this.widgets) {
				this.widgets[widgetName]._receive('ready');
			}
		},

		/**
		 * use this method for change initial options
		 */
		setOptions: function (options) {
			if (options.data) {
				this.setData(options.data);
				this._onDataChangeHandler();
			}
			if (options.el) {
				this.layout = null;
				this.el = options.el;
			}

			if (options.selectable !== undefined) this.selectable = options.selectable;
			if (options.helper) this.helper = options.helper;
			if (options.on) this.on = options.on;
			if (options.sort) this.sort = options.sort;
			if (options.hasFooter) this.hasFooter = options.hasFooter;
			if (options.templates) this.setTemplates(options.templates);
			if (options.showOnlyDescribed) this.showOnlyDescribed = options.showOnlyDescribed;
			if (options.order) this.order = options.order;
			if (options.hiddenFields) this.hiddenFields = options.hiddenFields;
			if (options.fields || options.order || options.showOnlyDescribed || options.hiddenFields || options.data || (!options.data && this.showOnlyDescribed)) {
				this.setFields(options.fields);
			}
			if (options.data || options.sort) {
				this.data.sort(this.sort);
			}
			this.emit('setOptions')
		},

		setData: function (data) {
			this.data = (data instanceof Qstore) ? (data || {columns: [], rows: []}): new Qstore(data);
			this.data.listener = $.proxy(this._dataListener, this);
		},

		setTemplates: function (templates) {
			if ($.isFunction(templates)) {
				templates = {columns: templates, cells: templates, feet: templates, master: templates};
			}
			this.templates = $.extend(true, {}, this.defaultTemplates, templates);
		},

		setFields: function (fields) {
			fields = fields || this.fields;
			var additionalFields = [];

			//set described fields
			for (var fieldName in fields) {
				var field = fields[fieldName];
				if (!$.isPlainObject(field)) field = {title: field};
				field = $.extend(true, {}, this.fieldsDefaults, field);
				field.name = fieldName;
				if (field.compute || fields[fieldName]) additionalFields.push(field);
				this.fields[fieldName] = field;
			}

			//set undescribed fields
			if (this.data) {
				for (var key in this.data.columns) {
					var fieldName = this.data.columns[key];
					if (!this.fields[fieldName]) {
						this.fields[fieldName] = $.extend({}, this.params.fieldsDefaults);
					}
				}
			}

			//collect visible fields
			this.visibleFields = this.order.length ? [].concat(this.order) : [].concat(this.data.columns);
			for (var i = this.visibleFields.length; i--;) {
				var fieldName = this.visibleFields[i];
				if (!this.fields[fieldName]) throw ('field "' + fieldName + '" not found');
				if (~$.inArray(fieldName, this.hiddenFields)) {
					this.visibleFields.splice(i, 1);
					continue;
				}
				if (!fields[fieldName] && this.showOnlyDescribed && (!~$.inArray(fieldName, this.order))) this.visibleFields.splice(i, 1);
			}

			if (!this.showOnlyDescribed) {
				for (var i = 0; i < this.data.columns.length; i++) {
					var column = this.data.columns[i];
					if (~$.inArray(column, this.visibleFields)) continue;
					if (!~$.inArray(column, this.hiddenFields)) this.visibleFields.push(column);
				}
			}

			this.data.addFields(additionalFields);
		},
		
		
		/**
		 * render table
		 * @param {jQueryObject|String} [el] container or selector of area
		 * WARNING! method does not guarantee that all widgets will be rendered
		 * @see renderWidgets
		 */
		render: function (el) {
			var selector = null;
			if (typeof(el) == 'string') {
				if (!this.layout) return false;
				selector = el;
				el = null;
			}

			if (el && el.length) this.el = el;
			if (!selector && (!this.el || !this.el.length)) return;

			if (!this.templates.layout) {
				throw('templates are not installed');
				return;
			}

			var firstTimeRendering = (el && el.length) || !(this.layout);

			if (!selector) {
				this.layout = $(this.templates.renderer(this));

				//widgets
				if (firstTimeRendering || !this.enabled) {
					this.renderWidgets();
				} else {
					this.layout.find('.widgets').append(this.jqWidgets);
					for (var widgetName in this.widgets) {
						var widget = this.widgets[widgetName];
						if (widget.target) {
							if (widget.el) this.layout.find(widget.target).replaceWith(widget.el);
							else widget.render(this.layout.find(widget.target));
						}
					}
				}


				if (firstTimeRendering || !this.enabled) {
					this._attachEvents();
					this.enabled = true;
				}

				this.el.html(this.layout);

			} else {
				var $part = $(this.templates.renderer(this)).find(selector);
				this.layout.find(selector).replaceWith($part);
			}


			this._renderChecked();

			if (this.scrollParams.vertical) {

				if (!jQuery.fn.mousewheel) {
					throw ('you need to jquery.mousewheel plugin for use scroll. You can find it in "optional" folder.');
					return false;
				}

				this.resize();

			}

			//fix column width
			for (var fieldName in this.fields) {
				var field = this.fields[fieldName];
				if (field.fixedWidth) {
					var jqColumn = this.el.find('tr .col-' + fieldName);
					if (!field.width) field.width = jqColumn.width();
					jqColumn.width(field.width);
				}
			}
			this.emit('render', selector);
		},

		/**
		 *  resize table in scroll mode
		 *  @param {Boolean} [throttle=false]
		 */
		resize: function (throttle) {

			throttle = typeof(throttle) == 'boolean' || false;


			if (throttle && this.resizeTimeoutId) {
				this.el.parent().css({overflow: 'hidden'});
				this.layout.width(this.layout.width());
				clearTimeout(this.resizeTimeoutId);
				this.resizeTimeoutId = setTimeout(this.resize.bind(this), this.resizeThrottle);
				return;
			}

			if (throttle) {
				this.resizeTimeoutId = -1;
			} else {
				this.resizeTimeoutId = null;
				this.layout.css({width: 'auto'});
				this.el.parent().css({overflow: 'visible'});
			}

			//resize table header and footer
			if (this.scrollParams.autoSizing) {
				var jqThead = this.el.find('.data-table > thead').hide();
				var widths = [];
				var jqThs = jqThead.find('tr:first > th > .column-wrap');
				if (!this.rowsCnt) {
					jqThs.css({display: 'table-cell'});
				} else {
					jqThs.css({display: 'inline-block'});
					this.el.find('.data-table .vscroll-layer > tbody > tr:first td').each(function () {
						widths.push($(this).outerWidth());
					});

					var i = 0;
					var lastLeftPos = 0;
					jqThs.each(function () {
						$(this).outerWidth(widths[i]);
						lastLeftPos += widths[i];
						i++;
					});

				}

				lastLeftPos = 0;
				if (this.hasFooter) {
					var jqTfoot = this.el.find('.data-table > tfoot:first').hide();
					var jqFeet = jqTfoot.find('tr:first > td > .foot-wrap');
					if (!this.rowsCnt) {

						i = 0;
						jqFeet.each(function () {
							$(this).outerWidth(widths[i]);
							lastLeftPos += widths[i];
							i++;
						});
					}
					jqTfoot.show();
				}

				jqThead.show();
			}

			if (this.scrollParams.horizontal) {
				var jqHOverflow = this.el.find('.hscroll-overflow');
				jqHOverflow.css({height: 'auto'});
				var height = this.el.height();
				var wrapHeight = this.el.find('.table-wrap').outerHeight();
				var freeHeight = height - wrapHeight;
				jqHOverflow.height(jqHOverflow.height() + freeHeight);
				this.scrollParams.overflowWidth = jqHOverflow.width();
				this.scrollParams.layerWidth = this.el.find('.hscroll-layer').width();

				var jqVOverflow = this.el.find('.vscroll-overflow');
				jqVOverflow.css({height: 'auto'});
				jqVOverflow.height(this.el.find('.vscroll-overflow-td').parent().height());

				//firefox table fix
				var theadHeight = jqHOverflow.find('thead:first').outerHeight();
				var tfootHeight = jqHOverflow.find('tfoot:first').outerHeight() || 0;
				var freeTableHeight = jqHOverflow.height() - theadHeight - tfootHeight;
				jqVOverflow.height(freeTableHeight);
				this.el.find('.vscroll-overflow-td').height(freeTableHeight);

			} else if (this.scrollParams.vertical) {

				var jqVOverflow = this.el.find('.vscroll-overflow');
				jqVOverflow.css({height: 'auto'});
				var height = this.el.height();
				var wrapHeight = this.el.find('.table-wrap').outerHeight();
				var freeHeight = height - wrapHeight;
				jqVOverflow.height(jqVOverflow.height() + freeHeight);

				var jqHscrollLayer = this.el.find('.hscroll-layer');
				this.el.find('.hscroll-overflow').css({height: 'auto'});
				if (this.scrollParams.horizontal) this.el.find('.hscroll-overflow').height(jqHscrollLayer.height());
			}

			this.scrollParams.overflowWidth = this.el.find('.hscroll-overflow').width();
			this.scrollParams.layerWidth = this.el.find('.hscroll-layer').outerWidth();
			this.scrollParams.overflowHeight = jqVOverflow.height();
			this.scrollParams.layerHeight = this.el.find('.vscroll-layer').height();

			this.scrollTo(this.scrollParams.vPos, this.scrollParams.hPos);
			this.emit('resize');
		},

		disable: function () {
			this.enabled = false;
			this.el && this.el.off('.table');
			this.emit('disable');
		},

		enable: function () {
			this.enabled = false;
			this._attachEvents();
			this.emit('enable');
		},

		/**
		 * apply function for each displayed row
		 * forEach ([selector,] fn)
		 * @param {Object|Function} opt1
		 * @param {Function} [opt2]
		 * @return {Number} processed rows count
		 */
		forEach: function (opt1, opt2) {
			var fn = opt2 ? opt2 : opt1;
			var selector = opt2 ? opt1 : null;
			if (!this.data || !this.data.size()) return 0;
			var cnt = 0;
			for (var i = 0; i < this.data.rows.length; i++) {
				var row = this.data.rows[i];
				if (!this.data.test(row, this.computedFilter)) continue;
				if (selector && !this.data.test(row, selector)) continue;
				fn(row);
				cnt++;
			}
			return cnt;
		},

		/**
		 * same as Qstore.find, but only on filtered data
		 * @param {Object|Function} expr
		 * @return {Array} rows
		 */
		find: function (expr) {
			var rows = [];
			for (var i = 0; i < this.data.rows.length; i++) {
				var row = this.data.rows[i];
				if (!this.data.test(row, this.computedFilter)) continue;
				if (!this.data.test(row, expr)) continue;
				rows.push(row);
			}
			return rows;
		},

		/**
		 * switching page
		 * @param {Number|String} page number of page or 'prev' or 'next'
		 * @return {Boolean}
		 */
		switchPage: function(page) {
			if (!page || !this.perPage || !this.rowsCnt) return false;
			var pagesCnt = Math.ceil(this.rowsCnt / this.perPage);
			if (page == 'prev') page = Number(this.page) - 1;
			if (page == 'next') page = Number(this.page) + 1;
			if (page > pagesCnt || page < 1) return false;
			this.page = Number(page);
			this.saveState();
			this.render();
			this.scrollTo(0);
			this.emit('pageSwitch');
			return true;
		},

		/**
		 * @example
		 *  table.addFilter({amount: {$gt: 200}});
		 * @example
		 *  table.addFilter('ammountFilter', {amount: {$gt: 200}});
		 */
		addFilter: function (opt1, opt2) {
			var expr = null;
			var name = null;
			if (arguments.length == 1) expr = opt1;
			if (arguments.length == 2) {
				name = opt1;
				expr = opt2;
			}
			name = name || 'defaultFilter';
			this.filters[name] = expr;
			this._computeFilter();
		},

		/**
		 * @param {String} [name='defaultFilter']
		 */
		removeFilter: function (name) {
			name = name || 'defaultFilter';
			delete this.filters[name];
			this._computeFilter();
		},

		/**
		 * render table widgets
		 */
		renderWidgets: function () {
			this.jqWidgets = this.layout.find('.widgets').empty();
			for (var key in this.widgets) {
				var widget = this.widgets[key];
				var selector = '.widget.' + this.utils.toScore(widget.name);
				var jqWidget = this.layout.find(selector);
				if (!jqWidget.length) {
					jqWidget = $(Haml.toHtml([selector]));
					this.jqWidgets.append(jqWidget);
				} else {
					widget.target = selector;
				}
				widget.render && widget.render(jqWidget);
			}
		},

		resetSort: function () {
			this.sort = null;
		},

		/**
		 * check or uncheck rows
		 * @param {Number|Array|Object} expr maybe idx or array of idx or expr
		 * @param {Boolean} [state=true]
		 */
		check: function (expr, state) {
			//swap arguments
			if ($.isArray(expr) || typeof(expr) == 'number' || typeof(expr) == 'string') expr = {idx: expr};
			if (state === undefined) state = true;

			this.forEach(expr, function (row) {
				var idx = row.idx;
				var selectedPos = $.inArray(idx, this.selection);
				if (state) {
					if (~selectedPos) return;
					this.selection.push(idx);
					return;
				}

				if (~selectedPos) {
					this.selection.splice(selectedPos, 1);
				}
			}.bind(this));

			this.emit('selectionChange');
			this._renderChecked();
		},

		/**
		 * @return {Number}
		 */
		checkedCnt: function () {
			return this._checkAll ? this.rowsCnt : this.selection.length;
		},

		/**
		 * rechek rows, need when selected rows was deleted
		 */
		recheck: function () {
			if (!this.selectable) return;
			if (this._checkAll) {
				this.checkAll();
				return;
			}

			for (var key = 0; key < this.data.rows.length; key++) {
				var row = this.data.rows[key];
				if (!this.data.test(row, this.computedFilter)) {
					var selectionPos = $.inArray(row.idx, this.selection);
					if (~selectionPos) this.selection.splice(selectionPos, 1);
				}
			}
			this.emit('selectionChange');
			this._renderChecked();
		},

		/**
		 * check or uncheck page rows
		 * @param {Boolean} [state=true]
		 */
		checkPage: function (state) {
			if (state === undefined) state = true;
			if (state) {
				var jqCheckbox = this.layout.find('th.col-checkbox .checkbox');
				jqCheckbox.removeClass('checked-all');
				jqCheckbox.addClass('checked');
			} else {
				this._checkAll = false;
			}
			var checkArr = [];
			var data = this.data.find(this.computedFilter);
			var from = this.page * this.perPage - this.perPage;
			var to = from + this.perPage;
			if (this.data && to > this.rowsCnt) to = this.rowsCnt;
			for (var i = from; i < to; i++) {
				var row = data[i];
				if (!row) continue;
				checkArr.push(row.idx);
			}
			this.check(checkArr, state);
		},

		/**
		 * check or uncheck filtered rows
		 * checkAll([expr], state)
		 * @param {Object|Function} [expr]
		 * @param {Boolean} [state=true]
		 */
		checkAll: function (expr, state) {
			var self = this;
			if (!expr || typeof(expr) == 'boolean') {
				state = expr;
				expr = null;
			}
			if (state === undefined) state = true;
			this._checkAll = !expr && state;
			var jqCheckbox = this.layout.find('th.col-checkbox .checkbox');
			if (expr) {
				this.forEach(function (row) {
					var pos = $.inArray(row.idx, this.selection);
					var rowState = this.data.test(row, expr) && state;
					if (!rowState && !~pos) return;
					if (!rowState && ~pos) {
						this.selection.splice(pos, 1);
						return;
					}
					if(!~pos) this.selection.push(row.idx);
				}.bind(this));

			} else {
				this.selection = [];
				if (state) {
					jqCheckbox.removeClass('checked');
					this.forEach(function (row) {
						self.selection.push(row.idx);
					});
					jqCheckbox.addClass('checked-all');

				} else {
					this.selection = [];
					jqCheckbox.removeClass('checked-all');
					jqCheckbox.removeClass('checked');
				}
			}

			this.emit('selectionChange');
			this._renderChecked();
		},

		isChecked: function (idx) {
			return ~$.inArray(idx, this.selection);
		},

		/**
		 * table events processing
		 * @param {String} eventName
		 * @param [data]
		 */
		emit: function(eventName, data) {
			//throw event to widgets
			for (var widgetName in this.widgets) {
				this.widgets[widgetName]._receive(eventName, data);
			}
			//external handler
			this.on && this.on[eventName] && this.on[eventName](data);
		},

		lock: function () {
			if (this.locked == true) return;
			this.locked = true;
			this.emit('tableLock');
		},

		unlock: function () {
			if (this.locked == false) return;
			this.locked = false;
			this.emit('tableUnlock');
		},

		/**
		 *
		 * @param {Number} idx
		 * @param {String} [content]
		 * @param {String} [animate]
		 * @returns {*}
		 */
		showSubrow: function (idx, content, animate) {
			if (!idx) return false;
			var jqRow = this.layout.find('.data-table tr[rel="' + idx +'"]');
			var row = this.data.findOne({idx: idx});
			if (!jqRow.length) return false;
			var tplParams = {tpl: {subrow: true}, table: this, row: row, content: content}
			var jqSubrow = $(this.templates.subrow(tplParams));
			jqRow.addClass('has-subrow');
			jqSubrow.insertAfter(jqRow);
			if (animate) jqSubrow.find('td').hide().show(animate);
			return jqSubrow;
		},
		
		hideSubrow: function (idx) {
			if (!idx) {
				this.layout.find('.has-subrow').removeClass('has-subrow');
				this.layout.find('.subrow').remove();
				return;
			}
			
			var jqRow = this.layout.find('.data-table tr[rel="' + idx +'"]');
			if (!jqRow.hasClass('has-subrow')) return;
			jqRow.removeClass('has-subrow');
			var jqSubrow = jqRow.next();
			if (!jqSubrow.hasClass('subrow')) return;
			jqSubrow.remove();
		},
		
		toggleSubrow: function (idx) {
			if (!idx) return;
			var jqRow = this.layout.find('.data-table tr[rel="' + idx +'"]');
			jqRow.hasClass('has-subrow') ? this.hideSubrow(idx) : this.showSubrow(idx);
		},

		/**
		 * add custom css-class for table
		 * @param {String} cssClass
		 * @returns {boolean}
		 */
		addClass: function (cssClass) {
			if (typeof(cssClass) != 'string') return false;
			if (~$.inArray(cssClass, this.cssClasses)) return false;
			this.cssClasses.push(cssClass);
			this.layout && this.layout.addClass(cssClass);
			return true;
		},

		/**
		 * remove custom css-class from table
		 * @param {String} cssClass
		 */
		removeClass: function (cssClass) {
			if (typeof(cssClass) != 'string') return false;
			var pos = $.inArray(cssClass, this.cssClasses);
			if (!~pos) return false;
			this.cssClasses.splice(pos, 1);
			this.layout && this.layout.removeClass(cssClass);
			return true;
		},

		/**
		 * save table state to cookie
		 */
		saveState: function () {
			//TODO: fix loadState without JSON
			return false
			var state = {
				page: this.page,
				perPage: this.perPage,
				sort: this.sort
			};
			$.cookie('table_' + this.name, JSON.stringify(state));
		},

		/**
		 * load table state from cookie
		 */
		loadState: function () {
			var state = JSON.parse($.cookie('table_' + this.name));
			state = $.extend({page: this.page, perPage: this.perPage, sort: this.sort}, state);
			this.page = state.page;
			this.perPage = state.perPage;
			this.sort = state.sort;
		},

		/**
		 * scroll to posiniton in pixels or percent
		 * @example
		 * table.scrollTo('50%', 50);
		 *
		 * @param {Number|String} offsetY
		 * @param {Number|String} offsetX
		 */
		scrollTo: function (offsetY, offsetX) {

			if (offsetY !== undefined && this.scrollParams.vertical) {
			//set vertical scroll layer position
				var maxVscroll = this.scrollParams.layerHeight - this.scrollParams.overflowHeight;
				if (maxVscroll < 0) maxVscroll = 0;

				//if offsetY in percent
				if (String(offsetY).indexOf('%') != -1) {
					var percent = Number(offsetY.split('%')[0]);
					offsetY = (percent/100) * maxVscroll;
				}

				if (offsetY < 0 || !offsetY) offsetY = 0;

				if (offsetY > maxVscroll) offsetY = maxVscroll;
				this.layout.find('.vscroll-layer:first').css({top: -offsetY});
				this.scrollParams.vPos = offsetY;

				//set scrollbar
				var jqVscroll = this.el.find('.vscroll:first');
				var jqScrollTrack =  jqVscroll.find('.scroll-track');
				var jqScrollbar = jqScrollTrack.find('.at-scrollbar');
				var vScaleFactor = this.scrollParams.overflowHeight / this.scrollParams.layerHeight;
				if (vScaleFactor > 1) {
					jqVscroll.addClass('disabled');
					this.layout.removeClass('vscroll-active');
					this.scrollParams.vScrollActive = false;
				} else {
					jqVscroll.removeClass('disabled');
					this.layout.addClass('vscroll-active');
					this.scrollParams.vScrollActive = true;
					var vBarHeight = vScaleFactor * jqScrollTrack.height();
					var vBarMinHeight = jqScrollbar.css('min-height').split('px')[0];
					if (vBarHeight < vBarMinHeight) vBarHeight = vBarMinHeight;
					jqScrollbar.height(vBarHeight);
					jqScrollbar.css({top: this.scrollParams.vPos * (jqScrollTrack.height() - vBarHeight) / (this.scrollParams.layerHeight - this.scrollParams.overflowHeight)});
				}
			}


			if (offsetX !== undefined && this.scrollParams.horizontal) {
				//set vertical scroll layer position
				var maxHscroll = this.scrollParams.layerWidth - this.scrollParams.overflowWidth;
				if (maxHscroll < 0) maxHscroll = 0;

				//if offsetX in percent
				if (String(offsetX).indexOf('%') != -1) {
					var percent = Number(offsetX.split('%')[0]);
					offsetX = (percent/100) * maxHscroll;
				}

				if (offsetX < 0 || !offsetX) offsetX = 0;

				if (offsetX > maxHscroll) offsetX = maxHscroll;
				this.layout.find('.hscroll-layer:first').css({left: -offsetX});
				this.scrollParams.hPos = offsetX;

				//set scrollbar
				var jqHscroll = this.el.find('.hscroll:first');
				var jqScrollTrack =  jqHscroll.find('.scroll-track');
				var jqScrollbar = jqScrollTrack.find('.at-scrollbar');
				var hScaleFactor = this.scrollParams.overflowWidth / this.scrollParams.layerWidth;
				if (hScaleFactor >= 1) {
					jqHscroll.addClass('disabled');
					this.scrollParams.hScrollActive = false;
					this.layout.removeClass('hscroll-active');
					return;
				}
				jqHscroll.removeClass('disabled');
				this.layout.addClass('hscroll-active');
				this.scrollParams.hScrollActive = true;
				var hBarWidth = hScaleFactor * jqScrollTrack.width();
				var hBarMinWidth = jqScrollbar.css('min-width').split('px')[0];
				if (hBarWidth < hBarMinWidth) hBarWidth = hBarMinWidth;
				jqScrollbar.width(hBarWidth);
				jqScrollbar.css({left: this.scrollParams.hPos * (jqScrollTrack.width() - hBarWidth) / (this.scrollParams.layerWidth - this.scrollParams.overflowWidth)});
			}
			this.emit('scroll', {offsetY: offsetY, offsetX: offsetX});
		},

		enableTextSelection: function () {
			this.canSelectText = true;
			this.layout.removeClass('unselectable');
		},

		disableTextSelection: function () {
			this.canSelectText = false;
			this.layout.addClass('unselectable');
		},

		/**
		 * render selection
		 * @private
		 */
		_renderChecked: function () {
			var self = this;
			var jqRows = this.layout.find('.dtable tbody tr:not(.fake)');
			var rowsOnPageCnt = jqRows.length;
			var i = 0;
			jqRows.each(function () {
				var jqRow =  $(this);
				var idx = Number(jqRow.attr('rel'));
				if (self._checkAll || ~$.inArray(idx, self.selection)) {
					i++;
					jqRow.addClass('selected');
					jqRow.find('.col-checkbox .checkbox').addClass('checked');
					return;
				}
				jqRow.removeClass('selected');
				jqRow.find('.col-checkbox .checkbox').removeClass('checked');
			});
			if (this._checkAll) {
				this.layout.find('.dtable th.col-checkbox .checkbox').removeClass('checked').addClass('checked-all');
			} else if (i == rowsOnPageCnt) {
				this.layout.find('.dtable th.col-checkbox .checkbox').addClass('checked');
			}
			if (this.selection.length) {
				this.layout.addClass('has-selected');
			} else {
				this.layout.removeClass('has-selected');
			}
		},

		/**
		 * calculates the main filter, based on all filters
		 * also recalculate rowsCnt and pagesCnt
		 * @private
		 */
		_computeFilter: function () {
			this.computedFilter = {$and: []};
			var cnt = 0;
			for (var key in this.filters) {
				if (this.filters[key]) {
					this.computedFilter.$and.push(this.filters[key]);
					cnt++;
				}
			}
			if (!cnt) this.computedFilter = null;
			this.rowsCnt = this.data.find(this.computedFilter).length;
			var pagesCnt = Math.ceil(this.rowsCnt / this.perPage);
			if (this.page < 1) this.page = 1;
			if (pagesCnt && this.page > pagesCnt) this.page = pagesCnt;
			this.emit('filter');
		},

		/**
		 * attach delegated DOM events
		 * @return {Boolean}
		 * @private
		 */
		_attachEvents: function () {
			if (!this.el || !this.el.length) return false;
			var self = this;
			this.el.off('.table');

			this.el.on('mousemove.table', function (e) {
				this.clientX = e.clientX;
				this.clientY = e.clientY;
				this.pageX = e.pageX;
				this.pageY = e.pageY;

				if (this.scrollParams.isVscrolling) {
					e.preventDefault()
					var jqScrollTrack = this.el.find('.vscroll:first .scroll-track');
					var jqScrollbar = jqScrollTrack.find('.at-scrollbar');
					var maxScroll = jqScrollTrack.height() - jqScrollbar.outerHeight();
					var scroll = this.pageY - jqScrollTrack.offset().top - this.scrollParams.vBarOffsetY;
					if (scroll < 0) scroll = 0;
					var scrollPercent = (scroll / maxScroll * 100) + '%';
					this.scrollTo(scrollPercent);
				}


				if (this.scrollParams.isHscrolling) {
					e.preventDefault()
					var jqScrollTrack = this.el.find('.hscroll:first .scroll-track');
					var jqScrollbar = jqScrollTrack.find('.at-scrollbar');
					var maxScroll = jqScrollTrack.width() - jqScrollbar.outerWidth();
					var scroll = this.pageX - jqScrollTrack.offset().left - this.scrollParams.hBarOffsetX;
					if (scroll < 0) scroll = 0;
					var scrollPercent = (scroll / maxScroll * 100) + '%';
					this.scrollTo(undefined, scrollPercent);
				}

			}.bind(this));

			this.el.on('mousewheel.table', '.dtable', function (e, undefined, deltaX, deltaY) {
				if (!this.scrollParams.vertical) return;
				var vAcceleration = this.scrollParams.vAcceleration;
				var hAcceleration = this.scrollParams.hAcceleration;
				var scrollY = this.scrollParams.vPos;
				var scrollX = this.scrollParams.hPos
				deltaY = deltaY * vAcceleration;
				deltaX = deltaX * hAcceleration;
				deltaY = deltaY > 0 ? Math.ceil(deltaY) : Math.floor(deltaY);
				deltaX = deltaX > 0 ? Math.ceil(deltaX) : Math.floor(deltaX);
				this.scrollTo(scrollY - deltaY, scrollX - deltaX);
				e.preventDefault();
			}.bind(this));

			this.el.on('mousedown.table', '.vscroll .at-scrollbar', function (e) {
				e.preventDefault()
				var jqScrollbar = $(e.currentTarget);
				this.scrollParams.vBarOffsetY = e.offsetY || e.originalEvent.layerY;
				this.scrollParams.isVscrolling = true;
				jqScrollbar.closest('.vscroll').addClass('active');
				this.disableTextSelection();
			}.bind(this));

			this.el.on('mousedown.table', '.hscroll .at-scrollbar', function (e) {
				e.preventDefault()
				var jqScrollbar = $(e.currentTarget);
				this.scrollParams.hBarOffsetX = e.offsetX || e.originalEvent.layerX;
				this.scrollParams.isHscrolling = true;
				jqScrollbar.closest('.hscroll').addClass('active');
				this.disableTextSelection();
			}.bind(this));

			this.el.on('mouseup.table', function (e) {
				this.scrollParams.isVscrolling = false;
				this.scrollParams.isHscrolling = false;
				this.el.find('.vscroll, .hscroll').removeClass('active');
				this.enableTextSelection();
			}.bind(this));

			//sort
			this.el.on('click.table', '.dtable th', function () {
				var sort = [];
				var fieldName = $(this).attr('rel');
				var resetSort = false;
				if (!self.fields[fieldName] || !self.fields[fieldName].sortable) return false;
				var order = 'desc';
				if ($(this).hasClass('desc')) order = 'asc';
				if ($(this).hasClass('asc')) {
					if (self.defaultSort) {
						resetSort = true;
					} else {
						order = 'desc';
					}
				}
				if (resetSort) {
					self.sort = null;
					self.data.sort(self.defaultSort);
				} else {
					sort.push({fieldName: fieldName, order: order});
					self.sort = sort;
					self.data.sort(sort);
				}
				self.saveState();
				self.render();
				self.scrollTo(0);
				return false;
			});

			//pagination
			this.el.on('click.table', '.pager a', function (e) {
				self.switchPage($(this).attr('rel'));
				e.preventDefault();
			});

			//checkboxes
			this.el.on('click.table', 'td.col-checkbox', function (e) {
				var jqCheckbox = $(e.currentTarget).find('.checkbox');
				var idx = jqCheckbox.attr('rel');
				if (!idx) return;
				self.check(idx, !jqCheckbox.hasClass('checked'));
				if (!e.shiftKey) {
					self.lastCheckedIdx = idx;
					return;
				}
				if (!self.lastCheckedIdx) return;

				var tmp;
				var fromIdx = idx;
				var toIdx = self.lastCheckedIdx;
				var jqFromRow = self.el.find('.dtable tr[rel="' + fromIdx + '"]');
				var jqToRow = self.el.find('.dtable tr[rel="' + toIdx + '"]');
				if (jqFromRow.index() > jqToRow.index()) {
					tmp = jqFromRow;
					jqFromRow = jqToRow;
					jqToRow = tmp;
				}
				var jqRow = jqFromRow;
				var checkIdxs = [];
				while ((jqRow = jqRow.next()).length) {
					if (jqRow.attr('rel') == jqToRow.attr('rel')) break;
					checkIdxs.push(jqRow.attr('rel'));
				}
				self.check(checkIdxs, true);
				self.render();
			});

			//multiple check
			this.el.on('click.table', 'th.col-checkbox', function (e) {
				var jqCheckbox = $(e.currentTarget).find('.checkbox');
				if (jqCheckbox.hasClass('checked')) {
					self.checkAll();
					return;
				}
				if (jqCheckbox.hasClass('checked-all')) {
					self.checkAll(false);
					return;
				}
				self.checkPage();
			});

			var fnMouseOutRow = function (jqRow) {
				jqRow.removeClass('hovered');
				jqRow.find('.editable').each(function () {
					var jqCell = $(this);
					var fieldName = jqCell.attr('rel');
					if (jqCell.data('editArea')) {
						jqCell.find('input[name="' + fieldName + '"]').replaceWith(jqCell.data('editArea'));
						jqCell.removeData('editArea');
					} else {
						jqCell.html(jqCell.data('content'));
						jqCell.removeData('content');
					}
				});
			};


			//dtable mouseleave
			this.el.on('mouseleave.table', '.dtable', function () {
				fnMouseOutRow(self.el.find('tr.hovered:not(.focused)'));
			}.bind(this));

			//table mouseleave
			this.el.on('mouseleave.table', function () {
				this.scrollParams.isVscrolling = false;
				this.scrollParams.isHscrolling = false;
			}.bind(this));

			//fields mouseenter
			this.el.on('mouseenter.table', 'tr:not(.focused)', function (e) {
				var jqPrevRow = self.el.find('tr.hovered:not(.focused)');
				fnMouseOutRow(jqPrevRow);
				var jqRow = $(e.currentTarget);
				if (jqRow.hasClass('fake')) return;
				if (jqRow.hasClass('vscroll-overflow-tr')) return;
				jqRow.addClass('hovered');
				jqRow.find('.editable').each(function () {
					var jqCell = $(this);
					var fieldName = jqCell.attr('rel');
					var value = jqCell.attr('value');
					var jqEditArea = jqCell.find('.edit-area');
					var jqField = '<input type="text" name="' + fieldName + '" value="' + (value !== undefined ? value : '') + '"/>';
					if (jqCell.data('editArea')) return;
					if (jqEditArea.length) {
						jqCell.data('editArea', jqEditArea.replaceWith(jqField));
					} else {
						var cellContent = jqCell.html();
						jqCell.html(jqField);
						jqCell.data('content', cellContent);
					}
				});
			});

			this.el.on('mouseleave.table', '.vscroll-layer', function (e) {
				fnMouseOutRow(this.el.find('tr.hovered:not(.focused)'));
			}.bind(this));

			//input focusin
			this.el.on('focusin.table', 'tr .editable input', function (e) {
				var jqInput = $(e.currentTarget);
				var jqRow = jqInput.closest('tr');
				self.el.find('tr.focused').removeClass('focused').mouseleave();
				jqRow.addClass('focused');
			});

			//input focusout
			this.el.on('focusout.table', '.editable input', function (e) {
				var jqRow = $(e.currentTarget).closest('tr');
				jqRow.removeClass('focused');
				fnMouseOutRow(jqRow);
			});

			//editable fields keyup
			this.el.on('keyup.table', '.editable input', function (e) {
				var jqInput = $(e.currentTarget);
				var jqCell = jqInput.closest('td');
				var value = jqInput.val();
				var field = self.fields[jqInput.attr('name')];
				var err = 0;

				if (field.minValue !== undefined) {
					if (value == '') {
						err++;
					} else {
						value = Number(value);
						if (isNaN(value)) {
							err++;
						} else if (value < field.minValue) {
							err++;
						}
					}
				}

				if (field.maxValue !== undefined) {
					if (value == '') {
						err++;
					} else {
						value = Number(value);
						if (isNaN(value)) {
							err++;
						} else if (value > field.maxValue) {
							err++;
						}
					}
				}

				if ((field.validation instanceof RegExp) && !field.validation.test(value)) {
					err++;
				}

				if (err) {
					jqCell.addClass('invalid');
				} else {
					jqCell.removeClass('invalid')
				}
			});

			//input keypress
			this.el.on('keypress.table', '.editable input', function (e) {
				var jqTd = $(e.currentTarget).closest('td'), keyCode = e.keyCode || e.which;
				if (jqTd.hasClass('number')) {
					~$.inArray(keyCode,ARROWS_BS_DEL)
						|| (keyCode >= DIGIT_BOUNDS[0] && keyCode <= DIGIT_BOUNDS[1])
						|| e.preventDefault();
				}
			});

			//input change
			this.el.on('change.table', '.editable input', function (e) {
				var jqInput = $(e.currentTarget);
				var jqCell = jqInput.closest('td');
				if (jqCell.hasClass('invalid')) {
					self.render();
					return;
				}
				var jqRow = jqCell.closest('tr');
				var fieldName = jqCell.attr('rel');
				var idx = jqRow.attr('rel');
				var patch = {};
				var field = self.fields[fieldName];
				var softMode = !field.saveChange;
				patch[fieldName] = jqInput.val();
	    			self.data.update({idx: idx}, patch, softMode);
				//TODO: DOM exeption on ENTER press
				self.render();
				if ($.browser.msie) return;
				setTimeout(function () {
					var jqElemendUnderMouse = $(document.elementFromPoint(self.clientX, self.clientY));
					var jqCell = jqElemendUnderMouse.closest('td');
					var jqRow = jqCell.closest('td');
					jqRow.mouseenter();
					if (jqCell.is('.editable')) jqCell.find('input').focus();
				});
			});


			//UI

			//checkbox
			this.el.on('mousedown.table', '.at-checkbox', function (e) {
				var $target = $(e.currentTarget);
				var $input = $target.find('input');
				if ($target.hasClass('checked')) {
					$target.removeClass('checked');
					$input.val('');
				} else {
					$target.addClass('checked');
					$input.val(1);
				}
				$input.change();
			});


			//dropdown
			this.el.on('click.table', '.at-dropdown-button', function (e) {
				e.preventDefault();
				var $dropdown = $(e.currentTarget).closest('.at-dropdown');
				var id = 'at-dropdown-' + $.now();
				if ($dropdown.hasClass('open')) return;
				$dropdown.addClass('open').attr('id', id);
				$dropdown.trigger('dropdownOpen');
				setTimeout(function () {
					$('body').on('click.' + id, function (e) {
						var $target = $(e.target);
						if (!$target.hasClass('.at-dropdown-button') && !$target.closest('.at-dropdown-button').length) {
							if ($target.attr('id') == id || $target.closest('#' + id).length) return;
						}
						$('body').off(e);
						$dropdown.removeClass('open');
						$dropdown.trigger('dropdownClose');
					});
				});
			});

			this.emit('attachEvents', this);
			return true;
		},

		//DATA EVENT HANDLERS:
		
		_dataListener: function (eventName, data) {
			switch (eventName) {
				case 'change': this._onDataChangeHandler(data); break;
				case 'fieldsChange': this._onDataFieldsChangeHandler(data); break;
				case 'commit': this._onDataCommitHandler(data); break;
			}
		},

		_onDataChangeHandler: function (change) {
			this._computeFilter();
			this.emit('dataChange', change);
			if (!change) return;
			if (this.selection.length) {
				if (change.action && ~$.inArray(change.action, ['remove', 'revert'])) this.recheck();
			}
			if (change.action && ~$.inArray(change.action, ['add', 'update'])) {
				this.sort = null;
			}
		},

		_onDataFieldsChangeHandler: function (change) {
			change = $.extend({action: null, fields: []}, change);
			
			if (change.action == 'remove') {
				for (var key in change.fields) {
					var fieldName = change.fields[key];
					if (this.fields[fieldName]) {
						var visiblePos = $.inArray(fieldName, this.visibleFields);
						if (~visiblePos) this.visibleFields.splice(visiblePos, 1);
						delete this.fields[fieldName];
					}
				}
				return;
			}

			for (var key in this.data.columns) {
				var fieldName = this.data.columns[key];
				if (~$.inArray(fieldName, this.hiddenFields)) continue;
				if (!this.fields[fieldName]) {
					this.fields[fieldName] = $.extend({}, this.params.fieldsDefaults, {name: fieldName});
					if (!this.showOnlyDescribed) this.visibleFields.push(fieldName);
				}
			}
		},

		_onDataCommitHandler: function () {
			this.emit('commit');
		},

		//EXTERNAL EVENT HANDLERS:

		_onFilterHandler: function (widget, expr) {
			if (!expr) {
				widget.name ? this.removeFilter(widget.name) : this.removeFilter();
			} else {
				widget.name ? this.addFilter(widget.name, expr) : this.addFilter(expr);
			}
			if (this.selection.length) this.recheck();
			this.render('.data-table');
		},

		_onPerPageHandler: function (e) {
			e = $.extend({value: 1, caller: null}, e);
			if (!e.caller || e.caller.isRendered) {
				this.perPage = Number(e.value);
				this.switchPage(1);
				this.render();
			}
		},

		_onClearSelectionHandler: function () {
			this.checkAll(false);
		},

		_onCommitHandler: function () {
			this.data.commit();
		},

		_onRollbackHandler: function () {
			this.data.rollback();
			this.emit('rollback');
			this.render();
		}
	},
	// STATIC PROPS:
	{

		Haml: Haml,
			Widget: Widget,
			utils: tableUtils,
			widgetsSet: {},

		/**
		 * installWidget ([parent], name, prototype)
		 */
		installWidget: function (parent, name, prototype ) {
			switch (arguments.length) {
				case 2:
					prototype = name;
					name = parent;
					var Parent = ActiveTable.Widget;
					break;
				case 3:
					var Parent = ActiveTable.getWidget(parent);
					if (!Parent) {
						console.log('parent widget not found');
						return false;
					}
					break;
				default:
					console.error('wrong arguments count');
					return false;
					break;
			}

			var NewWidget = Parent.extend(prototype);
			NewWidget.prototype.componentName = name;
			ActiveTable.widgetsSet[name] = NewWidget;
		},

		installDefaultTemplates: function(templates) {
			if (!this.prototype.defaultTemplates) this.prototype.defaultTemplates = {};
			this.prototype.defaultTemplates = $.extend({}, this.prototype.defaultTemplates, templates);
		},

		getWidget: function (name) {
			return this.widgetsSet[name];
		}

	});


	ActiveTable.installDefaultTemplates({

		renderer: function (table) {
			var layout, ttable, tbody, thead, tfoot, pagination;

			pagination = table.templates.pagination({tpl: {pagination: true}, table: table});

			// COLUMNS:

			var columns = '';
			var feet = '';
			var fieldName = '';

			if (table.selectable) {
				columns += table.templates.checkboxHead({tplCheckboxHead: true, table: table});
				var checkboxFoot = table.templates.checkboxFoot({tpl:{checkboxFoot: true}, table: table});
				feet += table.templates.checkboxFootWrap({tpl: {checkboxFootWrap: true}, table: table, content: checkboxFoot});
			}

			for (var key = 0; key < table.visibleFields.length; key++) {
				fieldName = table.visibleFields[key];
				var field = table.fields && table.fields[fieldName] || false;
				field = $.extend({}, field);
				if ($.isFunction(field.title)) field.title = field.title(field, table);

				var columnParams = {
					tpl: {
						column: true,
						field: {}
					},
					table: table,
					fieldName: fieldName,
					title: field.title,
					field: field,
					sFieldName: table.utils.toScore(fieldName),
					sort: ((table.sort && table.sort[0] && table.sort[0].fieldName == fieldName) ? table.sort[0].order : ''),
					type: (field.type ? table.utils.toScore(field.type) : ''),
					isFirst: (!table.selectable && fieldName == table.visibleFields[0]),
					isLast: (fieldName == table.visibleFields[table.visibleFields.length - 1])
				};
				columnParams.tpl.field[fieldName] = true;

				var footParams = $.extend({}, columnParams);
				footParams.tpl = {foot: true, field: {}}
				footParams.tpl.field[fieldName] = true;

				var content = '';
				var footContent = '';

				if ($.isFunction(table.templates.columns)) {
					content = table.templates.columns(columnParams).trim();
				} else if (table.templates.columns[fieldName]) {
					content = table.templates.columns[fieldName](columnParams);
				}

				if (content === '') content = field.title || fieldName;


				if ($.isFunction(table.templates.feet)) {
					footContent = table.templates.feet(footParams).trim();
				} else if (table.templates.feet[fieldName]) {
					footContent = table.templates.feet[fieldName](footParams);
				}

				var columnWrapParams = columnParams;
				columnWrapParams.tpl = {columnWrap: true,field: {}};
				columnWrapParams['tpl']['field'][fieldName] = true;

				var footWrapParams = $.extend({}, columnWrapParams);
				footWrapParams.tpl = {footWrap: true, field: {}};
				columnWrapParams['tpl']['field'][fieldName] = true;

				columnWrapParams.content = content;
				footWrapParams.content = footContent;

				var column = table.templates.columnWrap(columnParams);
				var foot = table.templates.footWrap(footWrapParams);
				columns += column;
				feet += foot;
			}
			thead = table.templates.thead({tpl: {thead: true}, table: table, columns: columns});
			if (table.hasFooter) tfoot = table.templates.tfoot({tpl: {tfoot: true}, table: table, columns: feet});

			// ROWS:

			var rows = '';
			var data = table.data.find(table.computedFilter || true);
			var from = table.page * table.perPage - table.perPage;
			var to = from + table.perPage;
			var odd = !!(from % 2);
			if (table.data && to > table.rowsCnt) to = table.rowsCnt;
			if (table.data && from > table.rowsCnt) from = 0;
			if (!table.rowsCnt) rows += table.templates.emptyRow({tpl: {emptyRow: true}, table: table});

			for (var i = from; i < to; i++) {
				var row = data[i];
				if (!row) continue;
				var rowParams = {
					tpl: {row: true},
					table: table,
					row: row,
					odd: odd
				}
				var cells = table.templates.trow(rowParams);

				var rowWrapParams = {
					tpl: {rowWrap: true},
					table: table,
					row: row,
					odd: odd,
					cells: cells
				}
				var row = table.templates.rowWrap(rowWrapParams);
				rows += row;
				odd = !odd;
			}

			var fakeRowsCnt = table.perPage - (to - from);
			if (table.fixedRowsCnt && fakeRowsCnt) {
				var fakeRow = {};
				for (var i = 0; i < table.data.columns; i++) {
					fakeRow[table.data.columns[i]] = null;
				}
				for (var i = 0; i < fakeRowsCnt; i++) {
					var rowParams = {
						tpl: {row: true},
						table: table,
						fake: true,
						row: row,
						odd: odd
					}
					var cells = table.templates.trow(rowParams);
					var rowWrapParams = {
						tpl: {rowWrap: true},
						table: table,
						fake: true,
						row: row,
						odd: odd,
						cells: cells
					}
					var row = table.templates.rowWrap(rowWrapParams);
					rows += row;
					odd = !odd;
				}
			}

			tbody = table.templates.tbody({tpl: {tbody: true}, table: table, rows: rows});
			ttable = table.templates.table({tpl: {table: true}, table: table, thead: thead, tbody: tbody, tfoot: tfoot});

			var vscroll = table.templates.vscroll({tpl: {vscroll: true}, table: table});
			var hscroll = table.templates.hscroll({tpl: {hscroll: true}, table: table});

			layout = table.templates.layout({
				tpl: {layout: true},
				table: table,
				ttable: ttable,
				vscroll: vscroll,
				hscroll: hscroll,
				pagination: pagination,
				sTableName: table.utils.toScore(table.name + '-table.active-table')
			});
			return layout;
		},

		// TEMPLATES:

		layout: function (p) {
			var table = p.table;
			var classes = '';
			classes = '.' + p.sTableName;
			if (!table.canSelectText) classes += '.unselectable';
			if (table.scrollParams.vertical) classes += '.has-vscroll';
			if (table.scrollParams.horizontal) classes += '.has-hscroll';
			if (table.scrollParams.hScrollActive) classes +='.hscroll-active';
			if (table.scrollParams.vScrollActive) classes +='.vscroll-active';
			if (table.selection.length) classes +='.has-selected';
			if (table.locked) classes += '.locked';
			if (table.cssClasses.length) classes += '.' + table.cssClasses.join('.');
			return context.ActiveTable.Haml.toHtml(["%div." + classes,
				['.table-wrap',
					['.lock-overlay'],
					['.widgets'],
					['.dtable', p.ttable, p.vscroll, p.hscroll],
					['.pager', p.pagination],
					[".clearfix", {style: 'clear:both'}]
				]
			]);
		},

		table: function (p) {
			if (!p.table.scrollParams.horizontal) {
				return context.ActiveTable.Haml.toHtml(['%table.data-table.',
					{cellspacing: "0"},
					p.thead,
					p.tfoot,
					p.tbody
				]);
			}

			return context.ActiveTable.Haml.toHtml(['.hscroll-overflow',
				['%table.data-table.hscroll-layer',
					{cellspacing: "0"},
					p.thead,
					p.tfoot,
					p.tbody
				]
			])

		},

		tbody: function (p) {
			if (!p.table.scrollParams.vertical) return context.ActiveTable.Haml.toHtml(["%tbody", p.rows]);
			var colspan = p.table.visibleFields.length;
			if (p.table.selectable) colspan++;
			return context.ActiveTable.Haml.toHtml(["%tbody",
				['%tr.vscroll-overflow-tr', ['%td.vscroll-overflow-td', {colspan: colspan},
					['%div.vscroll-overflow',
						['%table.vscroll-layer', {cellspacing: "0"}, p.rows]
					]
				]]
			]);
		},

		thead: function (params) {
			return context.ActiveTable.Haml.toHtml(["%thead", ["%tr", params.columns]]);
		},

		tfoot: function (params) {
			return context.ActiveTable.Haml.toHtml(["%tfoot", ["%tr", params.columns]]);
		},

		trow: function (p) {
			var tpl = p.table.templates;
			var row = p.row;
			var table = p.table;
			var cells = '';
			if (table.selectable) cells += table.templates.checkboxCell({tpl: {checkboxCell: true}, row: row});

			for (var key = 0; key < table.visibleFields.length; key++) {
				var fieldName = p.table.visibleFields[key];
				var field = p.table.fields[fieldName];
				var cell = $.extend({value: row[fieldName], display: row[fieldName]}, field);

				var cellParams = {
					tpl: {cell: true, field: {}},
					table: table,
					cell: cell,
					row: row,
					fieldName: fieldName,
					sFieldName: table.utils.toScore(fieldName),
					fake: p.fake,
					isFirst: (!table.selectable && fieldName == table.visibleFields[0]),
					isLast: (fieldName == table.visibleFields[table.visibleFields.length - 1]),
					sort: ((table.sort && table.sort[0] && table.sort[0].fieldName == fieldName) ? "." + table.sort[0].order : "")
				};
				cellParams['tpl']['field'][fieldName] = true;

				if (!p.fake) {
					if (cell.display) {
						$.isFunction(cell.display) && (cell.display = cell.display({tpl: {cell: true}, cell: cell, row: row, table: table}));
					}
					switch (cell.type) {
						case 'date': cell.display = table.utils.dateToSting(row[fieldName]) || field.defaultValue || '';break;
						case 'number':
							if (cell.display !== null) {
								if (cell.display % 1) cell.display = cell.display.toFixed(2);
								cell.display = String(cell.display).replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ');
							}
							break;
					}
					if ($.isFunction(table.templates.cells)) {
						var cellContent = table.templates.cells(cellParams).trim();
						if (cellContent !== '') cell.display = cellContent;
					} else if (table.templates.cells[fieldName]) {
						cell.display = table.templates.cells[fieldName](cellParams);
					}
				} else {
					cell.display = '';
				}

				var cellWrapParams = cellParams;
				cellWrapParams.tpl = {cellWrap: true, field: {}},
					cellWrapParams.tpl.field = fieldName;

				cells += table.templates.cellWrap(cellWrapParams);
			}
			return cells;
		},

		checkboxHead: function (p) {
			return context.ActiveTable.Haml.toHtml(["%th.col-checkbox", ['.column-wrap', [".checkbox"]]]);
		},

		checkboxCell: function (p) {
			return context.ActiveTable.Haml.toHtml(["%td.col-checkbox.col-first", {rel: p.row.idx}, [".checkbox", {rel: p.row.idx}]]);
		},

		checkboxFootWrap: function (p) {
			return context.ActiveTable.Haml.toHtml(["%td.col-checkbox", ['.footer-wrap', p.content]]);
		},

		checkboxFoot: function (p) {
			return '';
		},

		emptyRow: function (p) {
			return context.ActiveTable.Haml.toHtml(["%tr.empty-row.fake", ["%td", {colspan: p.table.visibleFields.length}]]);
		},

		pagination: function (p) {
			var table = p.table;
			if (!table.perPage || !table.rowsCnt) return [];
			var maxPages = 10;
			var pagesCnt = Math.ceil(table.rowsCnt / table.perPage);
			if (pagesCnt == 1) return [];
			var pages = [];
			var displayPrev = (table.page == 1 ? "none" : "inherit");
			var displayNext = (table.page == pagesCnt ? "none" : "inherit");
			pages.push(["%a.button.next", {href: "#", rel: "next", style: "display:" + displayNext}, '>']);
			if (pagesCnt <= maxPages) {
				for (var i = 1; i <= pagesCnt; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
			} else if (table.page < maxPages) {
				for (var i = 1; i <= maxPages; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
				pages.push(["%i", "..."]);
				pages.push(["%a", {href: "#", rel: pagesCnt}, pagesCnt]);
			} else if(table.page > pagesCnt - maxPages) {
				pages.push(["%a", {href: "#", rel: 1}, 1]);
				pages.push(["%i", "..."]);
				for (var i = pagesCnt - maxPages; i <= pagesCnt; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
			} else {
				pages.push(["%a", {href: "#", rel: 1}, 1]);
				pages.push(["%i", "..."]);
				for (var i = table.page - 1; i < table.page + maxPages; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
				pages.push(["%i", "..."]);
				pages.push(["%a", {href: "#", rel: pagesCnt}, pagesCnt]);
			}
			pages.push(["%a.button.prev", {href: "#", rel: "prev", style: "display:" + displayPrev}, '<']);
			return [".pagination", pages];
		},

		subrow: function (p) {
			var table = p.table;
			var colspan = table.visibleFields.length;
			if (table.selectable) colspan++;
			var content = p.content;
			if (!content && table.templates.master) {
				var tplParams = $.extend({}, {tpl: {subrowContent: true}}, p)
				content = table.templates.master(tplParams);
			}
			return context.ActiveTable.Haml.toHtml(["%tr.subrow", ["%td", {colspan: colspan}, content ]]);
		},

		columnWrap: function (params) {
			var isFirst = params.isFirst ? '.col-first' : '';
			var isLast = params.isFirst ? '.col-last' : '';
			var type = params.type ? '.' + params.type : '';
			var sort = params.sort ? '.' + params.sort : '';
			var content = '<div class="column-wrap col-' + params.sFieldName + '-wrap">' + params.content + '</div>'
			return context.ActiveTable.Haml.toHtml(
				["%th.col-" + params.sFieldName + isFirst + isLast + type + sort, {rel: params.fieldName, title: params.field.hint}, content]);
		},


		footWrap: function (params) {
			var isFirst = params.isFirst ? '.col-first' : '';
			var isLast = params.isFirst ? '.col-last' : '';
			var type = params.type ? '.' + params.type : '';
			var sort = params.sort ? '.' + params.sort : '';
			var content = '<div class="foot-wrap col-' + params.sFieldName + '-wrap">' + params.content + '</div>'
			return context.ActiveTable.Haml.toHtml(["%td.col-" + params.sFieldName + isFirst + isLast + type + sort, {rel: params.fieldName, title: params.field.hint}, content]);
		},

		cellWrap: function (p) {
			var sort = (p.sort ? '.' + p.sort: '');
			var sort = (p.sort ? '.' + p.sort: '');
			var attr = {rel: p.fieldName, value: p.row[p.fieldName]};
			var editable = (p.cell.editable ? ".editable" : "");
			var first = (p.isFirst ? ".col-first" : "");
			var last = (p.isLast ? ".col-last" : "");
			var type = (p.cell.type ? "." + p.cell.type : "");
			return context.ActiveTable.Haml.toHtml(["%td.col-" + p.sFieldName + type + editable + first + last + sort, attr, p.cell.display]);
		},

		rowWrap: function (p) {
			var attr = {rel: p.row.idx}
			return context.ActiveTable.Haml.toHtml(["%tr." + (p.odd ? "odd" : "even") + (p.fake ? '.fake' : ''), attr, p.cells]);
		},

		vscroll: function (p) {
			if (!p.table.scrollParams.vertical) return '';
			return context.ActiveTable.Haml.toHtml(['.vscroll',
				['.scroll-btn.scroll-up'],
				['.scroll-track', ['.at-scrollbar']],
				['.scroll-btn.scroll-down']
			]);
		},

		hscroll: function (p) {
			if (!p.table.scrollParams.horizontal) return '';
			return context.ActiveTable.Haml.toHtml(['.hscroll',
				['.scroll-btn.scroll-left'],
				['.scroll-track', ['.at-scrollbar']],
				['.scroll-btn.scroll-right']
			]);
		},

		columns: {

		},

		cells: {

		},

		feet: {

		}
	});

})(window);
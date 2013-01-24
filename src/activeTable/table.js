(function (context) {

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
		widgets: {},
		widgetsOrder: [],
		helper: {},
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
			minValue: undefined
			//title: function (field) { return field.name}
			//display: function (row) {}
		},
		on: {}
	};


	/* Simple JavaScript Inheritance
	 * By John Resig http://ejohn.org/
	 * MIT Licensed.
	 */
	// Inspired by base2 and Prototype
		var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
		// The base Class implementation (does nothing)
		var Class = function(){};

		// Create a new Class that inherits from this class
		Class.extend = function(prop) {
			var _super = this.prototype;

			// Instantiate a base class (but only create the instance,
			// don't run the init constructor)
			initializing = true;
			var prototype = new this();
			initializing = false;

			// Copy the properties over onto the new prototype
			for (var name in prop) {
				if (name == '_static') continue;
				// Check if we're overwriting an existing function
				prototype[name] = typeof prop[name] == "function" &&
						typeof _super[name] == "function" && fnTest.test(prop[name]) ?
						(function(name, fn){
							return function() {
								var tmp = this._super;

								// Add a new ._super() method that is the same method
								// but on the super-class
								this._super = _super[name];

								// The method only need to be bound temporarily, so we
								// remove it when we're done executing
								var ret = fn.apply(this, arguments);
								this._super = tmp;

								return ret;
							};
						})(name, prop[name]) :
						prop[name];
			}

			prop['_static'] = $.extend({}, this._static, prop['_static']);
			if (prop['_static']) {
				for (var name in prop['_static']) {
					Class[name] =  prop['_static'][name];
				}
			}
			Class._static = prop['_static'];

			// The dummy class constructor
			function Class() {
				// All construction is actually done in the init method
				if ( !initializing && this.init )
					this.init.apply(this, arguments);
			}

			// Populate our constructed prototype object
			Class.prototype = prototype;

			// Enforce the constructor to be what we expect
			Class.prototype.constructor = Class;

			// And make this class extendable
			Class.extend = arguments.callee;

			return Class;
		};

	
	
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
		 * format number in format "999 999"
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
			this.data = null; //instanse of ActiveData
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
			this.locked = false;
			this.enabled = true;
			this.clientX = null;
			this.clientY = null;
			this.lastCheckedIdx = null;
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
			this.templates = $.extend(true, {}, this.defaultTemplates, this.params.templates);
			this.name = this.params.name;
			this.defaultSort = this.params.defaultSort;
			this.selectable = this.params.selectable;
			this.fixedRowsCnt = this.params.fixedRowsCnt;
			this.perPage = this.params.perPage;
			this.on = this.params.on;
			this.sort = this.params.sort;
			this.helper = this.params.helper;
			this.widgetsOrder = options.widgetsOrder || this.widgetsOrder || this.params.widgetsOrder;
			this.showOnlyDescribed = this.params.showOnlyDescribed;
			this.el = this.params.el;

			this.setData(this.params.data);
			this.setFields(this.params.fields);

			this.rowsCnt = this.data.size();
			//this.loadState();
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
				} else {
					widget = new params(this);
				}
				
				if (!widget.name) {
					console.error('unnamed widget detected');
					return false;
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
			if (options.sort) this.sort = sort;
			if (options.showOnlyDescribed) this.showOnlyDescribed = options.showOnlyDescribed;
			if (options.fields || options.showOnlyDescribed || (!options.data && this.showOnlyDescribed)) {
				this.setFields(options.fields);
			}
			if (options.data || options.sort) {
				this.data.sort(this.sort);
			}
		},

		setData: function (data) {
			this.data = (data instanceof ActiveData) ? (data || {columns: [], rows: []}): new ActiveData(data);
			this.data.listener = $.proxy(this._dataListener, this);
		},

		setFields: function (fields) {
			fields = fields || this.fields;
			var additionalFields = [];
			var reduced = $.extend({rows: [], columns: []}, this.params.data);

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
			this.visibleFields = this.order.length ? this.order : this.data.columns;
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
		 * WARNING! method does not guarantee that all widgets will be rendered
		 * @see renderWidgets
		 */
		render: function (el) {
			if (el && el.length) this.el = el;
			if (!this.el || !this.el.length) return;

			if (!this.templates.layout) {
				throw('templates are not installed');
				return;
			}

			var firstTimeRendering = (el && el.length) || !(this.layout);
			this.layout = $(this.templates.layout(this));
			
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

			this._renderChecked();
			this.el.html(this.layout);
			if (firstTimeRendering || !this.enabled) {
				this._attachEvents();
				this.enabled = true;
			}

			//fix column width
			for (var fieldName in this.fields) {
				var field = this.fields[fieldName];
				if (field.fixedWidth) {
					var jqColumn = this.el.find('tr .col-' + fieldName);
					jqColumn.width(jqColumn.width());
				}
			}
			this.emit('render', this);
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
			for (var key in this.data.rows) {
				var row = this.data.rows[key];
				if (!this.data.test(row, this.computedFilter)) continue;
				if (selector && !this.data.test(row, selector)) continue;
				fn(row);
				cnt++;
			}
			return cnt;
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

		/**
		 * check or uncheck rows
		 * @param {Number|Array} idxs
		 * @param {Boolean} state
		 */
		check: function (idxs, state) {
			idxs = $.isArray(idxs) ? idxs : [idxs];
			if (!state) this._checkAll = false;
			for (var key = 0;  key < idxs.length; key++) {
				var idx = Number(idxs[key]);
				var selectedPos = $.inArray(idx, this.selection);
				if (state) {
					if (~selectedPos) continue;
					this.selection.push(idx);
					continue;
				}

				if (~selectedPos) {
					this.selection.splice(selectedPos, 1);
				}
			}
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
		 * @param {Boolean} [state=true]
		 */
		checkAll: function (state) {
			var self = this;
			if (state === undefined) state = true;
			if (!this.selectable) return;
			this._checkAll = state;
			this.selection = [];
			var jqCheckbox = this.layout.find('th.col-checkbox .checkbox');
			if (state) {
				this.forEach(function (row) {
					self.selection.push(row.idx);
				});
				jqCheckbox.removeClass('checked');
				jqCheckbox.addClass('checked-all');
				for (var key in this.data.rows) {
					var row = this.data.rows[key];
					if (this.data.test(row, this.computedFilter)) this.selection.push(row.idx);
				}
			} else {
				this.selection = [];
				jqCheckbox.removeClass('checked-all');
				jqCheckbox.removeClass('checked');
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
		 * @param data
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

		showSubrow: function (idx, content, animate) {
			if (!idx) return false;
			var jqRow = this.layout.find('.data-table tr[rel="' + idx +'"]');
			if (!jqRow.length) return false;
			var jqSubrow = $(this.templates.subrow(this));
			jqRow.addClass('has-subrow');
			jqSubrow.find('td').append(content);
			jqSubrow.insertAfter(jqRow);
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

			this.el.mousemove(function (e) {
				self.clientX = e.clientX;
				self.clientY = e.clientY;
			});

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


			//table mouseleave
			this.el.on('mouseleave.table', '.dtable', function () {
				fnMouseOutRow(self.el.find('tr.hovered:not(.focused)'));
			});

			//fields mouseenter
			this.el.on('mouseenter.table', 'tr:not(.focused)', function (e) {
				var jqPrevRow = self.el.find('tr.hovered:not(.focused)');
				fnMouseOutRow(jqPrevRow);
				var jqRow = $(e.currentTarget);
				if (jqRow.hasClass('fake')) return;
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

//					if (keyCode < 48 || keyCode > 57 || keyCode == 8) e.preventDefault();
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
			this.render();
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
		},
		
		_static: {
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

			//installWidgetTemplate: function()

			getWidget: function (name) {
				return this.widgetsSet[name];
			}
			
		}
		
	});
	


})(window);
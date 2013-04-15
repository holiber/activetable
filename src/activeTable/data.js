(function (context) {

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
	
	var ActiveData = context.ActiveData = Class.extend({

		init: function (reduce) {
			this.changes = {};
			this.sortFields = null;
			this.reduce = $.extend({}, reduce);
			var unpacked = this.unpack(this.reduce);
			this.rows = unpacked.rows;
			this.columns = unpacked.columns;
			this.lastIdx = unpacked.lastIdx;
			this.listener = function () {};
			this.computed = {};
			this.defaults = {};
		},

		/**
		 * data size
		 * @return {Number}
		 */
		size: function () {
			return (this.rows && this.rows.length) || 0;
		},


		/**
		 * unpack reduce data
		 * @param reduce
		 * @return {JSON} unpacked object like {rows: {*}, columns: {*}, lastIdx: * }
		 */
		unpack: function (reduce) {
			var empty = {columns: ['idx'], rows: [], lastIdx: 1};
			if (!reduce) return empty;
			if (!reduce.columns) return empty;
			var columns = ['idx'].concat(reduce.columns);
			var idx = 1;
			var rows = [];
			for (var rowKey = 0; rowKey < reduce.rows.length; rowKey++) {
				var row = {idx: idx};
				for (var columnKey = 0; columnKey < reduce.columns.length; columnKey++) {
					row[reduce.columns[columnKey]] = reduce.rows[rowKey][columnKey];
				}
				rows.push(row);
				idx++;
			}
			return {rows: rows, columns: columns, lastIdx: idx};
		},

		pack: function (expr, columns) {
			var columnsToPack = columns || this.columns;
			var rowsToPack = expr ? this.find(expr) : this.rows;
			var rows = [];
			for (var key in rowsToPack) {
				var row = rowsToPack[key];
				var packedRow = [];
				for (var i = 0; i < columnsToPack.length; i++) {
					packedRow.push(row[columnsToPack[i]]);
				}
				rows.push(packedRow);
			}
			return {columns: columnsToPack, rows: rows}
		},

		/**
		 * find rows
		 * find([data,]  selector [,fields]);
		 * @return {Array}
		 * @example
		 *  //complex query
		 *  var items = data.find({color: ['red', 'green'], amount: {$gt: 10, $lt: 20}, $and: {weight: 100, width: 200} });
		 * @example
		 *  //static use:
		 *  var fruits = [{type: 'apple', color: 'red'}, {type: 'apple', color: 'green'}];
		 *  var redApples = data.find(fruits, {color: 'red'}
		 * @example
		 *  //selection of fields to be added to the result
		 *  var fruits = [{type: 'apple', color: 'red', weight: 24}, {type: 'apple', color: 'green', weight: 20}];
		 *  var redApplesWeights = data.find(fruits, {color: 'red', ['weight']}
		 */
		find: function (opt1, opt2) {
			if (arguments.length == 1) {
				var data = this.rows;
				var expr = opt1;
			}

			if (arguments.length == 2) {
				if ($.isArray(opt2)) {
					var fieldsToAdd = opt2;
					var data = this.rows;
					var expr = opt1;
				} else {
					var data = opt1;
					var expr = opt2;
				}
			}

			var result = [];
			for (var key = 0; key < data.length; key++) {
				var row = data[key];
				if (expr !== true && !this.test(row, expr)) continue;
				if (fieldsToAdd) {
					var filteredRow = {};
					for (var i = fieldsToAdd.length; i--;) {
						filteredRow[fieldsToAdd[i]] = row[fieldsToAdd[i]];
					}
					result.push(filteredRow);
					continue;
				}
				result.push(row);
			}
			return result;
		},

		/**
		 * checks for compliance with an item of expression
		 * @param item
		 * @param {JSON} expr
		 * @param {String} [flag='$eq']
		 * @return {Boolean}
		 * @example
		 *  var apple = {type: 'apple', color: 'red'};
		 *  var isRed = data.test(apple, {color: 'red'});
		 */
		test: function (item, expr, flag) {

			if (typeof(expr) == 'string' || typeof(expr) == 'number') {
				flag = flag || '$eq';
				switch (flag) {
					case '$eq': return item == expr;
					case '$ne': return item != expr;
					case '$gt': return item > expr;
					case '$lt': return item < expr;
					case '$gte': return item >= expr;
					case '$lte': return item <= expr;
					case '$like': return item !== null ? ~item.toLowerCase().indexOf(expr) : false;
					default: return false;
				}
			}

			if (flag == '$and') {
				for (var key = 0; key < expr.length; key++) {
					if (!this.test(item, expr[key])) return false;
				}
				return true;
			}


			if (expr instanceof Array) {
				for (var key = 0; key < expr.length; key++) {
					if (this.test(item, expr[key])) return true;
				}
				return false;
			}

			if (typeof(expr) == 'object') {
				for (var key in expr) {

					if (key == '$and') {
						if (!this.test(item, expr[key], key)) return false;
						continue;
					}

					if (typeof(key) == 'string' && key.charAt(0) == '$') {
						if (!this.test(item, expr[key], key)) return false;
						continue;
					}

					if (!this.test(item[key], expr[key])) return false;
				}
				return true;
			}

			return false;
		},
		
		/**
			fire event
			@eventName {Sting}
			@data
		*/
		fire: function (eventName, data) {
			this.listener(eventName, data);
		},

		/**
		 * sort rows
		 * sort({Array} fields, {Boolean} zeroIsLast)
		 * sort({Function} fn)
		 * @param {Array} fields
		 * @example data.sort([{fieldName: 'amount', order: 'desc', zeroIsLast: true}])
		 */
		sort: function (opt, zeroIsLast) {
			if ($.isFunction(opt)) {
				this.rows.sort(opt);
				return;
			}

			var fields = $.isArray(opt) ? opt : [opt];
			var self = this;

			this.sortFields = fields || this.sortFields || [{fieldName: 'idx', order: 'asc'}];

			var fnAscSort = function (a, z, fieldIdx) {
				fieldIdx = fieldIdx || 0;
				var endZero = (self.sortFields[fieldIdx].zeroIsLast !== undefined) ? self.sortFields[fieldIdx].zeroIsLast : zeroIsLast;
				var fieldName = self.sortFields[fieldIdx].fieldName;

				if (endZero) {
					if (a[fieldName] !== z[fieldName]) {
						if (!a[fieldName]) return 1;
						if (!z[fieldName]) return -1;
					}
				}
				if (a[fieldName] == z[fieldName]) {
					var nextField = self.sortFields[fieldIdx + 1];
					if (!nextField) {
						return a.idx - z.idx;
					}
					var nextFieldOrder = nextField.order || 'asc';
					if (nextFieldOrder == 'asc') return fnAscSort(a, z, fieldIdx + 1);
					return fnDescSort(a, z, fieldIdx + 1)
				}
				if (a[fieldName] < z[fieldName]) return -1;
				if (a[fieldName] > z[fieldName]) return 1;
				if (typeof(a[fieldName]) == "number" || typeof(z[fieldName]) == "number") return  (typeof(a[fieldName]) == "number") ? 1 : -1;
				if (typeof(a[fieldName]) == "string" || typeof(z[fieldName]) == "string") return  (typeof(a[fieldName]) == "string") ? -1 : 1;
				return a.idx - z.idx;
			};

			var fnDescSort = function (a, z, fieldIdx) {
				fieldIdx = fieldIdx || 0;
				var endZero = (self.sortFields[fieldIdx].zeroIsLast !== undefined) ? self.sortFields[fieldIdx].zeroIsLast : zeroIsLast;
				var fieldName = self.sortFields[fieldIdx].fieldName;

				if (endZero) {
					if (a[fieldName] !== z[fieldName]) {
						if (!a[fieldName]) return -1;
						if (!z[fieldName]) return 1;
					}
				}
				if (a[fieldName] == z[fieldName]) {
					var nextField = self.sortFields[fieldIdx + 1];
					if (!nextField) {
						return z.idx - a.idx;
					}
					var nextFieldOrder = nextField.order || 'asc';
					if (nextFieldOrder == 'asc') return fnAscSort(a, z, fieldIdx + 1);
					return fnDescSort(a, z, fieldIdx + 1)
				};
				if (a[fieldName] < z[fieldName]) return 1;
				if (a[fieldName] > z[fieldName]) return -1;
				if (typeof(a[fieldName]) == "number" || typeof(z[fieldName]) == "number") return (typeof(a[fieldName]) == "number") ? -1 : 1;
				if (typeof(a[fieldName]) == "string" || typeof(z[fieldName]) == "string") return  (typeof(a[fieldName]) == "string") ? 1 : -1;
				return z.idx - a.idx;
			};

			var firstField = this.sortFields[0];
			firstField.order = firstField.order || 'asc';
			if (firstField.order == 'desc') {
				this.rows.sort(fnDescSort);
			} else {
				this.rows.sort(fnAscSort);
			}
		},

		/**
		 * update ([expr,] values [,soft=false])
		 * @param {Object} expr
		 * @param {Object|Function} values
		 * @param {Boolean} soft true if not need to save changes and fire event
		 * @return {Number} updated rows count
		 */
		update: function (opt1, opt2, opt3) {
			var expr = opt2 ? opt1 : null;
			var values = opt2 ? opt2 : opt1;
			var soft = typeof(opt2) == "boolean" ? opt2 : (typeof(opt3) == "boolean") ? opt3 : false;
			var cnt = 0;
			var operationChanges = [];
			for (var key = 0; key < this.rows.length; key++) {
				var row = this.rows[key];
				if (!expr || this.test(row, expr)) {
					var rowValues = $.isFunction(values) ? values(row) : values;
					if (!rowValues) continue;
					cnt++;
					var lastChange = (this.changes[row.idx]) || {};
					var change =  {action: 'update', source: lastChange.source || $.extend({}, row), values: $.extend({}, lastChange.values || {}, rowValues)};
					for (var fieldName in rowValues) {
						row[fieldName] = rowValues[fieldName];
					}
					if (!soft) {
						operationChanges.push(change);
						this.changes[row.idx] = change;
					}
				}
			}
			this.compute();
			if (!soft) this.fire('change', {action: 'update', changes: operationChanges});
			return cnt;
		},

		/**
		 * add row to data
		 * @param {Array|Object} rows
		 */
		add: function (rows, soft) {
			//TODO: сompute only added fields
			rows = $.isArray(rows) ? rows : [rows];
			for (var key = 0; key < rows.length; key++) {
				var row = rows[key];
				for (var fieldName in row) {
					if (!~$.inArray(fieldName, this.columns)) {
						// just remove field( instead of throwing exception )
						delete row[key];
					}
				}
				row.idx = ++this.lastIdx;
				var change = {action: 'add', values: row};
				if (!soft) this.changes[row.idx] = change;
				this.rows.push(row);
			}
			this.compute();
			this.sortFields = null;
			this.fire('change', change);
			return true;
		},

		/**
		 * remove rows by expr
		 * @param expr
		 * @return {Number} removed count
		 * @example
		 *  //remove red and green apples
		 *  data.remove({type: 'apple', color: ['red', 'green']});
		 */
		remove: function (expr, soft) {
			soft = soft || false;
			var operationChanges = [];
			var cnt = 0;

			for (i = 0; i < this.rows.length; i++) {
				var row = this.rows[i];
				if (this.test(row, expr)) {
					cnt++;
					if (!soft) {
						if (this.changes[row.idx]) {
							this.changes[row.idx].action = 'remove';
						} else {
							this.changes[row.idx] = {action: 'remove', source: row}
						}
					} else {
						if (this.changes[row.idx]) delete this.changes[row.idx];
					}
					operationChanges.push(this.changes[row.idx]);
					this.rows.splice(i, 1);
					i--;
				}
			}
			if (!soft) this.fire('change', {action: 'remove', changes: operationChanges});
			return cnt;
		},

		/**
		 * rollback changes
		 */
		rollback: function () {
			//TODO: rollback removed rows

			for (var i = this.rows.length; i--;) {
				var row = this.rows[i];
				var change = this.changes[row.idx];
				if (!change) continue;
				switch (change.action) {
					case 'update':
						this.rows[i] = change.source;
					break;
					case 'add':
						this.rows.splice(i, 1);
					break;
				}
			}

			this.fire('change', {action: 'rollback', changes: $.extend({}, this.changes)});
			this.changes = {};
		},

		/**
		 * commit changes
		 * @param {Boolean} [soft=false]
		 * @return {Number} changes count
		 */
		commit: function (soft) {
			var changesCnt = this.changes.length;
			if (!soft) this.fire('commit');
			this.changes = {};
			return changesCnt;
		},

		/**
		 * add new field
		 * @param {Array} fields array of strings or objects like {name: 'fieldName', defaultValue: 0, compute: function(row) { return row.a + row.b}}
		 */
		addFields: function (fields) {
			var length = fields.length;
			if (!length) return false;
			for (var i = 0; i < length; i++) {
				var field = $.extend({name: false, compute: false}, typeof(fields[i]) == 'string' ? {name: fields[i]} : fields[i]);
				if (!field.name) continue;
				var columnExist = ~$.inArray(field.name, this.columns);
				if (!columnExist) this.columns.push(field.name);
				if (field.compute) this.computed[field.name] = field.compute;
				if (field.defaultValue != undefined) this.defaults[field.name] = field.defaultValue;
			}
			this.compute();
			this.fire('fieldsChange', {action: 'add', fields: fields});
			return true;
		},

		/**
		 * calculate computed fields and just added fields
		 */
		compute: function () {
			for (var i = this.size(); i--;) {
				for (var j = this.columns.length; j--;) {
					var fieldName = this.columns[j];
					if (this.computed[fieldName]) {
						this.rows[i][fieldName] = this.computed[fieldName](this.rows[i]);
						continue;
					}
					if (this.rows[i][fieldName] === undefined) this.rows[i][fieldName] = '';
					if (this.defaults[fieldName] != undefined && this.rows[i][fieldName] == '') this.rows[i][fieldName] = this.defaults[fieldName];
				}
			}
		},

		/**
		 * @return {Number}
		 */
		changesCnt: function () {
			return app.utils.length(this.changes);
		},

		removeField: function (fieldName) {
			var fieldPos = $.inArray(fieldName, this.columns);
			if (~fieldPos) {
				this.columns.splice(fieldPos, 1);
				for (var key = 0; key < this.rows.length; key++) {
					delete this.rows[key][fieldName];
				}
			}
			this.fire('fieldsChange', {action: 'add', fields: [fieldName]});
		}
	});
	
})(window);
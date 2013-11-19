!function (context) {

	context.ActiveTable.installWidget('popupSearch', {

		/**
		 * @param {Table} table
		 * @param {Object} params
		 **/
		init: function (table, params) {window.ps = this;
			this._super(table);
			this.params = $.extend({fieldName: null, placeholder: ''}, params);
			this.fieldName = params.fieldName;
			this.val = '';
		},

		render: function ($el) {
			var firstRendering = !this.el;
			if ($el) this.el = $el;
			var $layout = $(this.tpl(this));
			var popupTplData = {
				tpl: {popupSearch: true},
				table: this.table,
				widget: this
			}
			var popupTpl = this.table.templates.master;
			if (!popupTpl) {
				throw 'Template for popupSearch widget not found';
			}
			var $popupContent = $(this.table.templates.master(popupTplData));
			$popupContent.appendTo($layout.find('.at-dropdown-content'));

			//mark logic elements
			var idx = 0;
			$layout.find('.logic').each(function (i, el) {
				$(el).attr('id', 'logic-' + ++idx);
			});

			this.el.html($layout);
			if ($.fn.datepicker) {
				this.el.find('.date').datepicker();
			}
			this._attachEvents();
			this.enabled = true;
			if (firstRendering) setTimeout(this.apply.bind(this));
			this.emit('render');
		},

		apply: function () {

			this.val = this.el.find('.search-text').val();
			if (typeof(this.fieldName) == 'string') this.fieldName = [this.fieldName];

			var searchExpr = [];
			var fields = this.fieldName;
			for (var i = 0; i < fields.length; i++) {
				var obj = {};
				obj[fields[i]] = {$like: this.val.toLowerCase()};
				searchExpr[i] = obj;
			}
			var filterExpr = this.getExpr();
			var expr = {$and: [searchExpr, filterExpr]};
			this.emit('filter', expr);
		},

		getExpr: function ($node) {
			if (!$node) $node = this.el.find('.logic:first');
			var logic = $node.attr('rel');
			var id = $node.attr('id');
			var result = [];
			var $inputs = $node.parent().find('#' + id + ' input:not(#' + id + ' .logic *)');
			$inputs.each(function (i, el) {
				var expr = $(el).attr('rel');
				var isDate = $(el).hasClass('date') && $(el).hasClass('hasDatepicker');
				var value = isDate ? $(el).datepicker('getDate') : $(el).val();
				if (isDate && value) value = value.valueOf();
				if (!expr || !value) return;
				expr = expr.replace(/'/g, '"');
				if (value) expr = expr.replace(/#value#/g, value);
				result.push(JSON.parse(expr));
			});

			var $logics = this.firstMeet($node, '.logic');
			$logics.each(function (i, el) {
				result.push(this.getExpr($(el)));
			}.bind(this));

			if (logic == 'or') return result;
			if (logic == 'and') return {$and: result};
		},

		firstMeet: function ($node, selector) {
			var $result = $();
			$node.find('> *').each(function (i, el) {
				if ($(el).is(selector)) {
					$result = $result.add($(el));
					return;
				}
				$result = $result.add(this.firstMeet($(el), selector));
			}.bind(this));
			return $result;
		},

		reset: function () {
			this.val = '';
			if (!this.isRendered) return;
			this.el.find('.search-text').val('');
			this.apply();
		},

		_attachEvents: function () {
			var self = this;
			var namespace = '.' + this.name;
			this.el.off(namespace);

			this.el.on('keyup' + namespace, '.search-text', function (e) {
				$(this).change();
			});

			this.el.on('change' + namespace, 'input', function (e) {
				self.apply();
			});
		}

	});

	context.ActiveTable.getWidget('popupSearch').installTemplate(function (widget) {
		return '' +
			'<div class="at-dropdown">' +
				'<input type="text" class="search-text" placeholder="' + widget.params.placeholder + '" value="' + widget.val + '"/>' +
				'<a class="at-button at-dropdown-button" href="#">' +
					'<div class="at-icon at-search"></div><div class="at-icon at-down"></div>' +
				'</a>' +
				'<div class="at-dropdown-content">' +
				'</div>' +
			'</div>'
	})

}(window)
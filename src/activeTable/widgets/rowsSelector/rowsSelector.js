;!function (ActiveTable) {

	var DEFAULT_PARAMS = {
		mode: 'checkbox', // "checkbox" or "radio"
		selectors: []
	}

	var DEFAULT_SELECTOR_PARAMS = {
		expr: {},
		isChecked: false,
		title: ''
	}

	ActiveTable.installWidget('rowsSelector', {

		init: function (table, params) {
			params = $.extend({}, DEFAULT_PARAMS, params);
			this._super(table);
			this.mode = params.mode;
			this.selectors = params.selectors;
			this.isChecked = false;
			for (var i = 0; i < this.selectors.length; i++) {
				this.selectors[i] = $.extend({}, DEFAULT_SELECTOR_PARAMS, {id: i} , this.selectors[i]);
			}
		},

		render: function ($el) {
			if ($el) this.el = $el;

			this.isChecked = this.table._checkAll;
			this.hasChecked = this.isChecked || !!this.table.selection.length;

			for (var i = 0; i < this.selectors.length; i++) {
				var selector = this.selectors[i];
				var isChecked = true;
				var rows = this.table.find(selector.expr);
				if (!rows.length) {
					selector.isChecked = false;
					continue;
				}
				for (var j = 0; j < rows.length; j++) {
					if (!this.table.isChecked(rows[j].idx)) {
						isChecked = false;
						break;
					}
				}
				selector.isChecked = isChecked;
			}

			var $layout = $(this.tpl(this));
			this.el.html($layout);
			var $colCheckbox = this.table.el.find('.data-table th.col-checkbox');
			if (!$colCheckbox.length) return false;
			var colCheckboxOffset = $colCheckbox.offset();
			this.el.offset({top: colCheckboxOffset.top, left: colCheckboxOffset.left});
			this.el.outerWidth($colCheckbox.outerWidth());
			this.el.outerHeight($colCheckbox.outerHeight());
			$colCheckbox.find('.column-wrap > *').hide();
			this._attachEvents();
		},

		reset: function (e) {
			e && e.preventDefault();
			this.table.checkAll(false);
		},

		_attachEvents: function () {
			var namespace = '.' + this.name;
			this.el.off(namespace);
			this.el.on('change' + namespace, '.at-checkbox input', this._onCheckboxChange.bind(this));
			this.el.on('click' + namespace, '.nothing', this.reset.bind(this));
		},

		_receive: function (eventName, data) {
			this._super(eventName, data);
			switch (eventName) {
				case 'dataChange':
				case 'filter:':
				case 'selectionChange':
				case 'render':
					this.render();
					break;
			}
		},


		_onCheckboxChange: function (e) {
			var $checkbox = $(e.currentTarget).closest('.at-checkbox');
			var id = $checkbox.attr('rel');
			var isChecked = $checkbox.hasClass('checked');

			if(id == 'all'){
				this.table.checkAll(isChecked);
			} else {
				if (this.mode === 'radio')
					this.table.checkAll(this.selectors[id].expr, isChecked);
				else
					this.table.check(this.selectors[id].expr, isChecked);
			}
		}
	});


	ActiveTable.getWidget('rowsSelector').installTemplate(function (widget) {
		var selectors = '';
		for (var i = 0; i < this.selectors.length; i++) {
			var selector = this.selectors[i];
			var checked = selector.isChecked ? 'checked' : '';
			selectors += '<label class="at-checkbox ' + checked + '" rel="' + i + '"><span></span><input/>' + selector.title + '</label>'
		}

		var checked = this.isChecked ? 'checked checked-all' : this.hasChecked? 'checked' : '';

		return '<div class="at-dropdown">' +
			'<div class="at-dropdown-button">' +
				'<label class="at-checkbox ' + checked + '" rel="all"><span></span><input/></label>' +
				'<div class="at-icon at-down"></div>' +
			'</div>' +
			'<div class="at-dropdown-content">' +
				'<a href="#" class="nothing"></a>' +
				selectors +
			'</div>'
		'</div>';
	});

} (ActiveTable)
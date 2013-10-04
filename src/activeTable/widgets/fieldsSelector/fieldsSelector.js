!function (ActiveTable) {


	ActiveTable.installWidget('fieldsSelector', {

		init: function (table, fields) {
			this._super(table);
			this.isOpen = false;
			this.fields = {};
			for (var i = 0; i < fields.length; i++) {
				var fieldName = fields[i];
				this.fields[fieldName] = false;
			}
		},

		render: function ($el) {
			if ($el) this.el = $el;

			for (var fieldName in this.fields) {
				var isShown = true;
				if (~$.inArray(fieldName, this.table.hiddenFields)) isShown = false;
				this.fields[fieldName] = isShown;
			}

			var $layout = $(this.tpl(this));
			this.el.html($layout);
			this._attachEvents();
			if (this.isOpen) this.open();
		},

		open: function () {
			this.isOpen = true;
			this.el.find('.dropdown-content').show();
		},

		close: function () {
			this.isOpen = false;
			this.el.find('.dropdown-content').hide();
		},

		_attachEvents: function () {
			var namespace = '.' + this.name + '_widget';
			$(document).off(namespace);
			this.el.off(namespace);
			$(document).on('click' +  namespace, this._onDocumentClick.bind(this));
			this.el.on('click' + namespace, '.dropdown-button', this._onDropdownClick.bind(this));
			this.el.on('change' + namespace, 'input', this._onChange.bind(this));
		},

		_onDropdownClick: function (e) {
			e.preventDefault();
			e.stopPropagation();
			this.isOpen ? this.close() : this.open();
		},

		_onDocumentClick: function (e) {
			var $target = $(e.target);
			if (!$target.closest('.widget.fields-selector').length) this.close();
		},

		_onChange: function (e) {
			var $input = $(e.currentTarget);
			var fieldName = $input.attr('name');
			if (!fieldName) return;
			var hiddenFields = [].concat(this.table.hiddenFields);
			if (Number($input.val())) {
				var fieldPos = $.inArray(fieldName, hiddenFields);
				if (fieldPos == -1) return;
				hiddenFields.splice(fieldPos, 1);
			} else {
				hiddenFields.push(fieldName);
			}
			this.table.setOptions({hiddenFields: hiddenFields});
			this.table.render();
		}

	});


	ActiveTable.getWidget('fieldsSelector').installTemplate(function (widget) {
		var fieldsDropdownContent = '';
		for (var fieldName in widget.fields) {
			fieldsDropdownContent += '<label class="at-checkbox ' + (widget.fields[fieldName] ? 'checked' : '') + '" rel="' + fieldName + '"><span></span><input name="' + fieldName + '">' + widget.table.fields[fieldName].title + '</label>';
		}

		return '<div>' +
			'<a href="#" class="at-button dropdown-button"><div class="at-icon at-view"></div><div class="at-icon at-down"></div></a>' +
			'<div class="dropdown-content">' +
				fieldsDropdownContent +
			'</div>' +
		'</div>';
	});

} (ActiveTable)
!function (context) {

	context.ActiveTable.installWidget('search', {

		/**
		 * @param {Table} table
		 * @param {Object} params
		 **/
		init: function (table, params) {
			this._super(table);
			this.params = $.extend({fieldName: null, placeholder: ''}, params);
			this.fieldName = params.fieldName;
			this.val = '';
			this.isRendered = false;
			this.hasFocus = false;
		},

		render: function (jqEl) {
			this.isRendered = !!(this.el);
			if (jqEl) this.el = jqEl;
			var jqLayout = $(this.tpl(this));
			this.el.html(jqLayout);
			this._attachEvents();
			this.isRendered = true;
			this.enabled = true;
			this.emit('render');
		},

		apply: function () {

			this.val = this.el.find('.search-text').val();
			if (typeof(this.fieldName) == 'string') {
				var expr = {};
				expr[this.fieldName] = {$like: this.val.toLowerCase()};
				this.emit('filter', this, expr);
				return;
			}

			var expr = [];
			var fields = this.fieldName;
			for (var i = 0; i < fields.length; i++) {
				var obj = {};
				obj[fields[i]] = {$like: this.val.toLowerCase()};
				expr[i] = obj;
			}
			this.emit('filter', expr);
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
				self.apply();
			});

			this.el.on('focus' + namespace, '.search-text', function (e) {
				this.hasFocus = true;
			}.bind(this));

			this.el.on('blur' + namespace, '.search-text', function (e) {
				this.hasFocus = false;
			}.bind(this));
		},

		_receive: function (eventName, data) {
			this._super(eventName, data);
			switch (eventName) {
				case 'render': this._onTableRender();
			}
		},

		_onTableRender: function () {
			//if (this.hasFocus) this.el.find('.search-text').focus();
		}

	});

	context.ActiveTable.getWidget('search').installTemplate(function (widget) {
		return '<input type="text" class="search-text" placeholder="' + widget.params.placeholder + '" value="' + widget.val + '"/>';
	})

}(window)
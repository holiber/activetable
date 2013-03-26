(function (context) {

	context.ActiveTable.installWidget('actionButtons', {

		/**
		 * @param {Table} table
		 * @param {Array} params
		 **/
		init: function (table, params) {
			this._super(table);
			this.name = 'actionButtons';
			this.params = params;
			this.isRendered = false;
			if ($.isArray(params)) {
				this.buttons = params;
			} else {
				this.buttons = params.buttons;
			}
			for (var i = 0; i < this.buttons.length; i++) {
				var defaultButton = {
					name: 'unnamedButton',
					title: null,
					content: 'unnamedButton',
					action: null
				};
				var button = $.extend({}, defaultButton, this.buttons[i]);
				if (button.title === null) button.title = button.content;
				this.buttons[i] = button;
			}
		},

		render: function (jqEl) {
			if (this.templates)
			this.isRendered = !!(this.el);
			if (jqEl) this.el = jqEl;
			var jqLayout = $(this.tpl.layout(this));
			this.el.html(jqLayout);
			this._attachEvents();
			this.isRendered = true;
			this.enabled = true;
			this.table.checkedCnt() ? this.el.addClass('active') : this.el.removeClass('active');
			this.emit('render');
		},

		action: function (name) {
			if (name == 'clear') {
				this.emit('clearSelection');
				return;
			}
			for (var key in this.buttons) {
				var button = this.buttons[key];
				if (button.name != name) continue;
				button.action && button.action.call(this.table, this, button);
				return;
			}
		},

		_attachEvents: function () {
			var self = this;
			var namespace = '.' + this.name;
			this.el.off(namespace);
			this.el.on('click' + namespace, '.button', function (e) {
				self.action.call(self, $(e.currentTarget).attr('rel'));
				e.preventDefault();
			});
		},

		_receive: function (eventName, data) {
			this._super(eventName, data);
			switch (eventName) {
				case 'selectionChange': this._onSelectionChange();break;
				case 'ready': this._onReady();break;
			}
		},

		_onSelectionChange: function () {
			this.render();
		},

		_onReady: function () {
			var self = this;
			if (!this.params.on) return;
			for (var eventName in this.params.on) {
				var defaultHandler  = this.on[eventName];
				if (this.params.on[eventName]) this.on[eventName] = function () {
					if (self.params.on[eventName](self)) defaultHandler && defaultHandler(self);
				}
			}
		}

	});

})(window);
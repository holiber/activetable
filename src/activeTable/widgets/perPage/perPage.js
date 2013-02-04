;(function(context){

	context.ActiveTable.installWidget('perPage', {
		
		init: function (table, params) {
			this._super(table, params);
			this.expr = null;
			this.value = this.table.perPage;
			this.isRendered = false;
		},

		render: function ($el) {
			this.isRendered = !!(this.el);
			if ($el) this.el = $el;
			var jqLayout = $(this.tpl.layout(this));
			this.el.html(jqLayout);
			this.el.find('select').val(this.value);
			this._attachEvents();
			this.isRendered = true;
			this.enabled = true;

		},

		_attachEvents: function () {
			var self = this;
			if (!this.el) return false;
			this.el.off('.perPage');

			this.el.on('change.perPage', 'select', function (e) {
				var target = $(e.currentTarget);
				self.value = target.val();
				self.emit('perPage', {value: self.value, caller: self});
			});

			return true;
		}

	});
})(window);
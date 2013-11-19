;(function(context){

	context.ActiveTable.installWidget('html', {
		
		init: function (table, params) {
			this._super(table);
			this.params = params;
		},

		render: function ($el) {
			if ($el) this.el = $el;
			var html = '';
			if (typeof(this.params) == 'string') html = this.params;
			if ($.isArray(this.params)) $(ActiveTable.Haml.toHtml(this.params));
			var jqLayout = $('<div></div>').append(html);
			this.el.html(jqLayout);
		}

	});

})(window);
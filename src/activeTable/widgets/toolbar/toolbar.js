;(function(context){

	context.ActiveTable.installWidget('toolbar', {

		init: function (table, params) {
			this._super(table);
			this.defaultParams = {
				context: this.table
			}
			this.params = $.extend({}, this.defaultParams, params);
			this.context = this.params.context;
		},

		render: function ($el) {
			if ($el) this.el = $el;
			var params =  {
				tpl: {toolbarWidget: true},
				table: this.table,
				widget: this
			}
			var jqLayout = $('<div></div>').append($(this.table.templates.master(params)));
			this.el.html(jqLayout);
			this._attachEvents();
		},

		_attachEvents: function () {
			this.el.on('click', '.at-button,.button,.btn', this._onButtonClick.bind(this));
		},

		_onButtonClick: function (e) {
			e.preventDefault();
			var $button = $(e.currentTarget);
			if ($button.hasClass('with-selection') && !this.table.selection.length) return;
			var name = $button.attr('name');
			if (!name) return;
			if (this.context[name] && $.isFunction(this.context[name])) this.context[name].bind(this.context)();
		}

	});

})(window);

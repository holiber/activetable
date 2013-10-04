;(function(context){

	context.ActiveTable.installWidget('lockWaiting', {
		
		init: function (table) {
			this._super(table);
		},

		render: function ($el) {
			if ($el) this.el = $el;
			var jqLayout = $(this.tpl(this));
			if (this.el) this.el.html(jqLayout);

		},

		_receive: function (eventName, data) {
			switch (eventName) {
				case 'tableLock': this.render(); break;
				case 'tableUnlock': this.render(); break;
			}
		}

	});

	context.ActiveTable.getWidget('lockWaiting').installTemplate(function (widget) {
		if (!widget.table.locked) return '';
		return '<div class="waiting-icon"></div>';
	})

})(window);
(function (context) {

	context.ActiveTable.installWidget('SaveButtons', {

		/**
		 * @param {Table} table
		 * @param {Function} beforeCommit
		 **/
		init: function (table, beforeCommit) {
			this._super(table);
			this.name = 'saveButtons';
			this.isRendered = false;
			this.beforeCommit = (typeof(beforeCommit) == 'function') ? beforeCommit : null;
		},

		render: function (jqEl) {
			this.isRendered = !!(this.el);
			if (jqEl) this.el = jqEl;
			var jqLayout = $(Haml.toHtml(this.tpl.layout(this)));
			this.el.html(jqLayout);
			this._attachEvents();
			this.isRendered = true;
			this.enabled = true;
			if (app.utils.length(this.table.data.changes)) this._onDataChange();
		},

		save: function () {
			if (!this.beforeCommit || (this.beforeCommit && this.beforeCommit(this.table))) this.emit('commit', this);
		},

		cancel: function () {
			this.emit('rollback', this);
		},

		_attachEvents: function () {
			var self = this;
			var namespace = '.' + this.name;
			console.log(this);
			this.el.off(namespace);
			this.el.on('click' + namespace, '.save', function (e) {
				self.save();
				e.preventDefault();
			});
			this.el.on('click' + namespace, '.cancel', function (e) {
				self.cancel();
				e.preventDefault();
			});
		},

		_receive: function (eventName, data) {
			this._super(eventName, data);
			switch (eventName) {
				case 'dataChange': this._onDataChange();break;
				case 'commit': this._onCommit();break;
				case 'rollback': this._onRollback();break;
				case 'tableLock': this.render();break;
				case 'tableUnlock': this.render();break;
			}
		},

		_onDataChange: function () {
			if (!this.el) return;
			var changesCnt = app.utils.length(this.table.data.changes);
			if (changesCnt && !this.table.locked) {
				this.el.show();
			} else {
				this.el.hide();
			}
			this.el.find('.cnt').html(changesCnt);
			this.el.draggable();
		},

		_onCommit: function () {
			this.el.hide();
		},

		_onRollback: function () {
			this.el.hide();
		}

	});

})(window);
!function (ctx) {


ctx.Builder = function Builder () {
	this.$layout = null;
	this.$el = null;
	this.tableParams = null;
	this.table = null;
	this.init();
}

Builder.prototype = {

	init: function () {

	},

	render: function ($el) {
		if ($el) this.$el = $el;
		this._attachEvents();
	},

	getParamsString: function () {

	},

	_attachEvents: function () {
		var namespace = '.builder';
		this.$el.off(namespace);
	}
}

}(window)
;(function (context) {

	var tpl = {};
	tpl.layout = function (widget) {
		return Haml.toHtml([
			["%a.save", {href: "#"},["%ins"], "Сохранить"],
			["%a.cancel", {href: "#"},["%ins"], "Отменить"],
			["%span.cnt"]
		])
	};

	context.ActiveTable.getWidget('SaveButtons').installTemplate(tpl);

})(window);
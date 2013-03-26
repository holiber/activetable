(function () {

	var tpl = {};

	tpl.layout = function (widget) {
		var result = [[".left"]];
		for (var key = 0; key < widget.buttons.length; key++) {
			var button = widget.buttons[key];
			result.push(["%a.round-action-button.act-" + ActiveTable.utils.toScore(button.name) , {"href": "#", rel: button.name, title: button.title}, ["%ins.ib"], button.content]);
		}
		result.push([".right"],["%dfn"]);
		result = Haml.toHtml(result);
		return result;
	};

	ActiveTable.getWidget('actionButtons').installTemplate(tpl);

})();
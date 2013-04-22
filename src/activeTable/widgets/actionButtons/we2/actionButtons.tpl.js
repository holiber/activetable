(function (context) {

	var tpl = {};

	tpl.layout = function (widget) {
		var result = '';
		result += '<div class="left"></div>';
		var buttons = '';
		for (var key = 0; key < widget.buttons.length; key++) {
			var button = widget.buttons[key];
			buttons += '<a class="button act-' + context.ActiveTable.utils.toScore(button.name) + '"  href="#" rel="' + button.name + '" title="' + button.title +'">' + button.content + '</a>';
		}
		result += '<div class="button-group">' + buttons + '</div>';
		result += '<div class="right"></div>';
		return result;
	};

	context.ActiveTable.getWidget('actionButtons').installTemplate(tpl);

})(window);
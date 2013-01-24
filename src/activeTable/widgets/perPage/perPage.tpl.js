(function(context){
	var tpl = {};
	tpl.layout = function (widget) {
		return Haml.toHtml(["%div",
			"по ",
			["%select",[
				["%option", 20],
				["%option", 50],
				["%option", 100]
			]],
			" на странице"
		]);
	};
	
	//install template
	context.ActiveTable.getWidget('perPage').installTemplate(tpl);
})(window);
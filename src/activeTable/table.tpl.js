/**
 * require table.js 
 */
(function(context){

	context.ActiveTable.prototype.defaultTemplates = {
		layout: function (table) {
			return Haml.toHtml(["%div." + table.utils.toScore(table.name + '-table.active-table'),
				[".widgets"],
				[".dtable", table.templates.table(table)],
				[".pager", table.templates.pagination(table)],
				[".clearfix", {style: 'clear:both'}]
			]);
		},

		table: function (table) {
			return ["%table.data-table.",
				{cellspacing: "0"},
				table.templates.thead(table),
				table.templates.tbody(table)
			];
		},
	
		tbody: function (table) {
			if (!table.data || !table.data.columns) return [];
			var data = table.data.find(table.computedFilter);
			var rows = [];
			var from = table.page * table.perPage - table.perPage;
			var to = from + table.perPage;
			var odd = !!(from % 2);
			if (table.data && to > table.rowsCnt) to = table.rowsCnt;
			if (table.data && from > table.rowsCnt) from = 0;

			for (var i = from; i < to; i++) {
				var row = data[i];
				if (!row) continue;
				rows.push(this.trowAll(table, row, odd));
				odd = !odd;
			}

			var fakeRowsCnt = table.perPage - (to - from);
			if (table.fixedRowsCnt && fakeRowsCnt) {
				var fakeRow = {};
				for (var i = 0; i < table.data.columns; i++) {
					fakeRow[table.data.columns[i]] = null;
				}
				for (var i = 0; i < fakeRowsCnt; i++) {
					rows.push(table.templates.trowAll(table, fakeRow, odd, true));
					odd = !odd;
				}
			}
			return ["%tbody", rows];
		},

		thead: function (table) {
			var columns = [];
			var fieldName = '';

			if (table.selectable) columns.push(["%th.col-checkbox", [".checkbox"]]);
			for (var key = 0; key < table.visibleFields.length; key++) {
				fieldName = table.visibleFields[key];
				var field = table.fields && table.fields[fieldName] || false;
				var text = fieldName;
				if (table.templates.columns[fieldName]) {
					text = table.templates.columns[fieldName](field, table);
				} else if (field && field.title !== undefined) {
					$.isFunction(field.title) ? text = field.title(field, table) : text = field.title;
				}
				var sort = ((table.sort && table.sort[0] && table.sort[0].fieldName == fieldName) ? "." + table.sort[0].order : "");
				var type = (field.type ? "." + table.utils.toScore(field.type) : "");
				var isFirst = (!table.selectable && fieldName == table.visibleFields[0]) ? '.col-first' : '';
				var isLast = (fieldName == table.visibleFields[table.visibleFields.length - 1]) ? '.col-last' : '';
				columns.push(["%th.col-" + table.utils.toScore(fieldName) + isFirst + isLast + type + sort, {rel: fieldName, title: field.hint}, text]);
			}
			return ["%thead", ["%tr", columns]];
		},

		trowAll: function (table, row, odd, fake) {
			var tpl = table.templates;
			var cells = [];
			if (table.selectable) {
				cells.push(["%td.col-checkbox.col-first", {rel: row.idx}, [".checkbox", {rel: row.idx}]]);
			}
			for (var key = 0; key < table.visibleFields.length; key++) {
				var fieldName = table.visibleFields[key];
				var field = table.fields[fieldName];
				var cell = $.extend({value: row[fieldName], display: row[fieldName]}, field);
				if (!fake) {
					if (cell.display) {
						$.isFunction(cell.display) && (cell.display = cell.display(cell, row, table));
					}
					switch (cell.type) {
						case 'date': cell.display = table.utils.dateToSting(row[fieldName]) || field.defaultValue || '';break;
						case 'number':
							if (cell.display !== null) {
								if (!cell.display % 1) cell.display = cell.display.toFixed(2);
								cell.display = String(cell.display).replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ');
							}
							break;
					}
					if (table.templates.cells[fieldName]) {
						cell.display = table.templates.cells[fieldName](cell, row, table);
					}
				} else {
					cell.display = '';
				}
				var isFirst = (!table.selectable && fieldName == table.visibleFields[0]);
				var isLast = (fieldName == table.visibleFields[table.visibleFields.length - 1]);
				var sort = ((table.sort && table.sort[0] && table.sort[0].fieldName == fieldName) ? "." + table.sort[0].order : "");
				var attr = {rel: fieldName, value: row[fieldName]};
				var editable = (field.editable ? ".editable" : "");
				var first = (isFirst ? ".col-first" : "");
				var last = (isLast ? ".col-last" : "");
				var type = (field.type ? "." + table.utils.toScore(field.type) : "");
				cells.push(["%td.col-" + table.utils.toScore(fieldName) + type + editable + first + last + sort, attr, cell.display]);
			}
			var attr = {rel: row.idx};
			return [(tpl.row && tpl.row(row, table) + ".") || "%tr." + (odd ? "odd" : "even") + (fake ? '.fake' : ''), attr, cells];
		},

		pagination: function (table) {
			if (!table.perPage || !table.rowsCnt) return [];
			var maxPages = 10;
			var pagesCnt = Math.ceil(table.rowsCnt / table.perPage);
			if (pagesCnt == 1) return [];
			var pages = [];
			var displayPrev = (table.page == 1 ? "none" : "inherit");
			var displayNext = (table.page == pagesCnt ? "none" : "inherit");
			pages.push(["%a.button.next", {href: "#", rel: "next", style: "display:" + displayNext}, 'Вперед']);
			if (pagesCnt <= maxPages) {
				for (var i = 1; i <= pagesCnt; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
			} else if (table.page < maxPages) {
				for (var i = 1; i <= maxPages; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
				pages.push(["%i", "..."]);
				pages.push(["%a", {href: "#", rel: pagesCnt}, pagesCnt]);
			} else if(table.page > pagesCnt - maxPages) {
				pages.push(["%a", {href: "#", rel: 1}, 1]);
				pages.push(["%i", "..."]);
				for (var i = pagesCnt - maxPages; i <= pagesCnt; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
			} else {
				pages.push(["%a", {href: "#", rel: 1}, 1]);
				pages.push(["%i", "..."]);
				for (var i = table.page - 1; i < table.page + maxPages; i++) {
					pages.push(["%a" + (i == table.page ? ".current" : ""), {href: "#", rel: i}, i]);
				}
				pages.push(["%i", "..."]);
				pages.push(["%a", {href: "#", rel: pagesCnt}, pagesCnt]);
			}
			pages.push(["%a.button.prev", {href: "#", rel: "prev", style: "display:" + displayPrev}, 'Назад']);
			return [".pagination", pages];
		},

		subrow: function (table) {
			var colspan = table.visibleFields.length;
			if (table.selectable) colspan++;
			return Haml.toHtml(["%tr.subrow", ["%td", {colspan: colspan} ]]);
		},

		columns: {

		},

		cells: {

		}
	}

})(window);
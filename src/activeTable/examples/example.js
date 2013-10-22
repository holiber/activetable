$(function () {

	var data = {
		columns: ['type', 'color', 'weight', 'price'],
		rows: [
			['apple', 'red', 0.25, 1.5],
			['pear', 'green', 0.4, 2],
			['pear', 'red', 0.3, 1.8],
			['apple', 'yellow', 0.26, 1.2],
			['pineapple', 'yellow', 1, 4],
			['banana', 'yellow', 0.3, 1.5],
			['melon', 'yellow', 3, 3],
			['watermelon', 'green', 10, 5],
			['apple', 'green', 0.24, 1],
			['strawberries', 'red', 0.1, 0.2]
		]
	};

	var table = window.table = new ActiveTable({
		data: data,
		el: $('.table-place'),
		checked: true,
		order: ['type', 'color', 'weight', 'price', 'image'],
		fields: {
			image: {
				display: function (tplParams) { return '<img src="images/' + tplParams.row.type + '-' + tplParams.row.color + '.jpeg"/>'}
			}
		}
	});

	table.render();
});
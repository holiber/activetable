/**
 * subrow plugin
 */
!function (ActiveTable) {
	$.extend(ActiveTable.prototype, {
		/**
		 *
		 * @param {Number} idx
		 * @param {String} [content]
		 * @param {String} [animate]
		 * @returns {*}
		 */
		showSubrow: function (idx, content, animate) {
			if (!idx) return false;
			var jqRow = this.layout.find('.data-table tr[rel="' + idx +'"]');
			var row = this.data.findOne({idx: idx});
			if (!jqRow.length) return false;
			var tplParams = {tpl: {subrow: true}, table: this, row: row, content: content}
			var jqSubrow = $(this.templates.subrow(tplParams));
			jqRow.addClass('has-subrow');
			jqSubrow.insertAfter(jqRow);
			if (animate) jqSubrow.find('td').hide().show(animate);
			return jqSubrow;
		},

		hideSubrow: function (idx) {
			if (!idx) {
				this.layout.find('.has-subrow').removeClass('has-subrow');
				this.layout.find('.subrow').remove();
				return;
			}

			var jqRow = this.layout.find('.data-table tr[rel="' + idx +'"]');
			if (!jqRow.hasClass('has-subrow')) return;
			jqRow.removeClass('has-subrow');
			var jqSubrow = jqRow.next();
			if (!jqSubrow.hasClass('subrow')) return;
			jqSubrow.remove();
		},

		toggleSubrow: function (idx) {
			if (!idx) return;
			var jqRow = this.layout.find('.data-table tr[rel="' + idx +'"]');
			jqRow.hasClass('has-subrow') ? this.hideSubrow(idx) : this.showSubrow(idx);
		}
	});

	ActiveTable.installDefaultTemplates({
		subrow: function (p) {
			var table = p.table;
			var colspan = table.visibleFields.length;
			if (table.selectable) colspan++;
			var content = p.content;
			if (!content && table.templates.master) {
				var tplParams = $.extend({}, {tpl: {subrowContent: true}}, p)
				content = table.templates.master(tplParams);
			}
			return '<tr class="subrow"><td colspan="' + colspan + '">' + content + '</td></tr>';
		}
	});

}(ActiveTable);
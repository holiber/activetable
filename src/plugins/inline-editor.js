/**
 * inline editor plugin
 */
!function (ActiveTable) {

	ActiveTable.addListener(function (eventName) {
		if (eventName == 'attachEvents') _onAttachEvents.call(this);
	});

	function _onAttachEvents () {
		var self = this;

		var fnMouseOutRow = function (jqRow) {
			jqRow.removeClass('hovered');
			jqRow.find('.editable').each(function () {
				var jqCell = $(this);
				var fieldName = jqCell.attr('rel');
				if (jqCell.data('editArea')) {
					jqCell.find('input[name="' + fieldName + '"]').replaceWith(jqCell.data('editArea'));
					jqCell.removeData('editArea');
				} else {
					jqCell.html(jqCell.data('content'));
					jqCell.removeData('content');
				}
			});
		};


		//dtable mouseleave
		this.el.on('mouseleave.table', '.dtable', function () {
			fnMouseOutRow(self.el.find('tr.hovered:not(.focused)'));
		}.bind(this));


		//fields mouseenter
		this.el.on('mouseenter.table', 'tr:not(.focused)', function (e) {
			var jqPrevRow = self.el.find('tr.hovered:not(.focused)');
			fnMouseOutRow(jqPrevRow);
			var jqRow = $(e.currentTarget);
			if (jqRow.hasClass('fake')) return;
			if (jqRow.hasClass('vscroll-overflow-tr')) return;
			jqRow.addClass('hovered');
			jqRow.find('.editable').each(function () {
				var jqCell = $(this);
				var fieldName = jqCell.attr('rel');
				var value = jqCell.attr('value');
				var jqEditArea = jqCell.find('.edit-area');
				var jqField = '<input type="text" name="' + fieldName + '" value="' + (value !== undefined ? value : '') + '"/>';
				if (jqCell.data('editArea')) return;
				if (jqEditArea.length) {
					jqCell.data('editArea', jqEditArea.replaceWith(jqField));
				} else {
					var cellContent = jqCell.html();
					jqCell.html(jqField);
					jqCell.data('content', cellContent);
				}
			});
		});

		//input focusin
		this.el.on('focusin.table', 'tr .editable input', function (e) {
			var jqInput = $(e.currentTarget);
			var jqRow = jqInput.closest('tr');
			self.el.find('tr.focused').removeClass('focused').mouseleave();
			jqRow.addClass('focused');
		});

		//input focusout
		this.el.on('focusout.table', '.editable input', function (e) {
			var jqRow = $(e.currentTarget).closest('tr');
			jqRow.removeClass('focused');
			fnMouseOutRow(jqRow);
		});

		//editable fields keyup
		this.el.on('keyup.table', '.editable input', function (e) {
			var jqInput = $(e.currentTarget);
			var jqCell = jqInput.closest('td');
			var value = jqInput.val();
			var field = self.fields[jqInput.attr('name')];
			var err = 0;

			if (field.minValue !== undefined) {
				if (value == '') {
					err++;
				} else {
					value = Number(value);
					if (isNaN(value)) {
						err++;
					} else if (value < field.minValue) {
						err++;
					}
				}
			}

			if (field.maxValue !== undefined) {
				if (value == '') {
					err++;
				} else {
					value = Number(value);
					if (isNaN(value)) {
						err++;
					} else if (value > field.maxValue) {
						err++;
					}
				}
			}

			if ((field.validation instanceof RegExp) && !field.validation.test(value)) {
				err++;
			}

			if (err) {
				jqCell.addClass('invalid');
			} else {
				jqCell.removeClass('invalid')
			}
		});

		//input keypress
		this.el.on('keypress.table', '.editable input', function (e) {
			var jqTd = $(e.currentTarget).closest('td'), keyCode = e.keyCode || e.which;
			if (jqTd.hasClass('number')) {
				~$.inArray(keyCode,ARROWS_BS_DEL)
					|| (keyCode >= DIGIT_BOUNDS[0] && keyCode <= DIGIT_BOUNDS[1])
				|| e.preventDefault();
			}
		});

		//input change
		this.el.on('change.table', '.editable input', function (e) {
			var jqInput = $(e.currentTarget);
			var jqCell = jqInput.closest('td');
			if (jqCell.hasClass('invalid')) {
				self.render();
				return;
			}
			var jqRow = jqCell.closest('tr');
			var fieldName = jqCell.attr('rel');
			var idx = jqRow.attr('rel');
			var patch = {};
			var field = self.fields[fieldName];
			var softMode = !field.saveChange;
			patch[fieldName] = jqInput.val();
			self.data.update({idx: idx}, patch, softMode);
			//TODO: DOM exeption on ENTER press
			self.render();
			if ($.browser.msie) return;
			setTimeout(function () {
				var jqElemendUnderMouse = $(document.elementFromPoint(self.clientX, self.clientY));
				var jqCell = jqElemendUnderMouse.closest('td');
				var jqRow = jqCell.closest('td');
				jqRow.mouseenter();
				if (jqCell.is('.editable')) jqCell.find('input').focus();
			});
		});
	}

}(ActiveTable);

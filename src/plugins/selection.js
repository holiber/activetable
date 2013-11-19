/**
 * selection plugin
 */
!function(ActiveTable){

	ActiveTable.addListener(function (eventName) {
		switch (eventName) {
			case 'attachEvents': _onAttachEvents.call(this);break;
			case 'checked': this._renderChecked();break;
		}
	});

	function _onAttachEvents() {

		// single check
		this.el.on('click.table', 'td.col-checkbox', function (e) {
			var jqCheckbox = $(e.currentTarget).find('.checkbox');
			var idx = jqCheckbox.attr('rel');
			if (!idx) return;
			this.check(idx, !jqCheckbox.hasClass('checked'));
			if (!e.shiftKey) {
				this.lastCheckedIdx = idx;
				return;
			}
			if (!this.lastCheckedIdx) return;

			var tmp;
			var fromIdx = idx;
			var toIdx = this.lastCheckedIdx;
			var jqFromRow = this.el.find('.dtable tr[rel="' + fromIdx + '"]');
			var jqToRow = this.el.find('.dtable tr[rel="' + toIdx + '"]');
			if (jqFromRow.index() > jqToRow.index()) {
				tmp = jqFromRow;
				jqFromRow = jqToRow;
				jqToRow = tmp;
			}
			var jqRow = jqFromRow;
			var checkIdxs = [];
			while ((jqRow = jqRow.next()).length) {
				if (jqRow.attr('rel') == jqToRow.attr('rel')) break;
				checkIdxs.push(jqRow.attr('rel'));
			}
			this.check(checkIdxs, true);
			this.render();
		}.bind(this));

		//multiple check
		this.el.on('click.table', 'th.col-checkbox', function (e) {
			var jqCheckbox = $(e.currentTarget).find('.checkbox');
			if (jqCheckbox.hasClass('checked')) {
				this.checkAll();
				return;
			}
			if (jqCheckbox.hasClass('checked-all')) {
				this.checkAll(false);
				return;
			}
			this.checkPage();
		}.bind(this));
	}

	$.extend(ActiveTable.prototype, {
		/**
		 * check or uncheck rows
		 * @param {Number|Array|Object} expr maybe idx or array of idx or expr
		 * @param {Boolean} [state=true]
		 */
		check: function (expr, state) {
			//swap arguments
			if ($.isArray(expr) || typeof(expr) == 'number' || typeof(expr) == 'string') expr = {idx: expr};
			if (state === undefined) state = true;

			this.forEach(expr, function (row) {
				var idx = row.idx;
				var selectedPos = $.inArray(idx, this.selection);
				if (state) {
					if (~selectedPos) return;
					this.selection.push(idx);
					return;
				}

				if (~selectedPos) {
					this.selection.splice(selectedPos, 1);
				}
			}.bind(this));

			this.emit('selectionChange');
			this._renderChecked();
		},

		/**
		 * @return {Number}
		 */
		checkedCnt: function () {
			return this._checkAll ? this.rowsCnt : this.selection.length;
		},

		/**
		 * rechek rows, need when selected rows was deleted
		 */
		recheck: function () {
			if (!this.selectable) return;
			if (this._checkAll) {
				this.checkAll();
				return;
			}

			for (var key = 0; key < this.data.rows.length; key++) {
				var row = this.data.rows[key];
				if (!Qstore.test(row, this.computedFilter)) {
					var selectionPos = $.inArray(row.idx, this.selection);
					if (~selectionPos) this.selection.splice(selectionPos, 1);
				}
			}
			this.emit('selectionChange');
			this._renderChecked();
		},

		/**
		 * check or uncheck page rows
		 * @param {Boolean} [state=true]
		 */
		checkPage: function (state) {
			if (state === undefined) state = true;
			if (state) {
				var jqCheckbox = this.layout.find('th.col-checkbox .checkbox');
				jqCheckbox.removeClass('checked-all');
				jqCheckbox.addClass('checked');
			} else {
				this._checkAll = false;
			}
			var checkArr = [];
			var data = this.data.find(this.computedFilter || true);
			var from = this.page * this.perPage - this.perPage;
			var to = from + this.perPage;
			if (this.data && to > this.rowsCnt) to = this.rowsCnt;
			for (var i = from; i < to; i++) {
				var row = data[i];
				if (!row) continue;
				checkArr.push(row.idx);
			}
			this.check(checkArr, state);
		},

		/**
		 * check or uncheck filtered rows
		 * checkAll([expr], state)
		 * @param {Object|Function} [expr]
		 * @param {Boolean} [state=true]
		 */
		checkAll: function (expr, state) {
			var self = this;
			if (!expr || typeof(expr) == 'boolean') {
				state = expr;
				expr = null;
			}
			if (state === undefined) state = true;
			this._checkAll = !expr && state;
			var jqCheckbox = this.layout.find('th.col-checkbox .checkbox');
			if (expr) {
				this.forEach(function (row) {
					var pos = $.inArray(row.idx, this.selection);
					var rowState = Qstore.test(row, expr) && state;
					if (!rowState && !~pos) return;
					if (!rowState && ~pos) {
						this.selection.splice(pos, 1);
						return;
					}
					if(!~pos) this.selection.push(row.idx);
				}.bind(this));

			} else {
				this.selection = [];
				if (state) {
					jqCheckbox.removeClass('checked');
					this.forEach(function (row) {
						self.selection.push(row.idx);
					});
					jqCheckbox.addClass('checked-all');

				} else {
					this.selection = [];
					jqCheckbox.removeClass('checked-all');
					jqCheckbox.removeClass('checked');
				}
			}

			this.emit('selectionChange');
			this._renderChecked();
		},

		isChecked: function (idx) {
			return ~$.inArray(idx, this.selection);
		},

		/**
		 * render selection
		 * @private
		 */
		_renderChecked: function () {
			var self = this;
			var jqRows = this.layout.find('.dtable tbody tr:not(.fake)');
			var rowsOnPageCnt = jqRows.length;
			var i = 0;
			jqRows.each(function () {
				var jqRow =  $(this);
				var idx = Number(jqRow.attr('rel'));
				if (self._checkAll || ~$.inArray(idx, self.selection)) {
					i++;
					jqRow.addClass('selected');
					jqRow.find('.col-checkbox .checkbox').addClass('checked');
					return;
				}
				jqRow.removeClass('selected');
				jqRow.find('.col-checkbox .checkbox').removeClass('checked');
			});
			if (this._checkAll) {
				this.layout.find('.dtable th.col-checkbox .checkbox').removeClass('checked').addClass('checked-all');
			} else if (i == rowsOnPageCnt) {
				this.layout.find('.dtable th.col-checkbox .checkbox').addClass('checked');
			}
			if (this.selection.length) {
				this.layout.addClass('has-selected');
			} else {
				this.layout.removeClass('has-selected');
			}
		}
	});

	ActiveTable.installDefaultTemplates({
		checkboxHead: function (p) {
			return '<th class="col-checkbox"><div class="column-wrap"><div class="checkbox"></div></div></th>';
		},

		checkboxCell: function (p) {
			return '<td class="col-checkbox col-first" rel="' + p.row.idx + '">' +
				'<div class="checkbox" rel="' + p.row.idx +'">' +
				'</div>'
			'</td>'
		},

		checkboxFootWrap: function (p) {
			return '<td class="col-checkbox"><div class="footer-wrap">' + p.content + '</div></td>';
		},

		checkboxFoot: function (p) {
			return '';
		}
	})
}(ActiveTable)
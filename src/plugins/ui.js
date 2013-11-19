/**
 * ui plugin
 */
!function (ActiveTable) {

	ActiveTable.addListener(function (eventName) {
		if (eventName == 'attachEvents') _onAttachEvents.call(this);
	});

	function _onAttachEvents () {

		//checkbox
		this.el.on('mousedown.table', '.at-checkbox', function (e) {
			var $target = $(e.currentTarget);
			var $input = $target.find('input');
			if ($target.hasClass('checked')) {
				$target.removeClass('checked');
				$input.val('');
			} else {
				$target.addClass('checked');
				$input.val(1);
			}
			$input.change();
		});

		//dropdown
		this.el.on('click.table', '.at-dropdown-button', function (e) {
			e.preventDefault();
			var $dropdown = $(e.currentTarget).closest('.at-dropdown');
			var id = 'at-dropdown-' + $.now();
			if ($dropdown.hasClass('open')) return;
			$dropdown.addClass('open').attr('id', id);
			$dropdown.trigger('dropdownOpen');
			setTimeout(function () {
				$('body').on('click.' + id, function (e) {
					var $target = $(e.target);
					if (!$target.hasClass('.at-dropdown-button') && !$target.closest('.at-dropdown-button').length) {
						if ($target.attr('id') == id || $target.closest('#' + id).length) return;
					}
					$('body').off(e);
					$dropdown.removeClass('open');
					$dropdown.trigger('dropdownClose');
				});
			});
		});
	}

}(ActiveTable);
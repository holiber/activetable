!function (ActiveTable) {

	var MOUSEOUT_TIMEOUT = 1000;

	ActiveTable.installWidget('pageSwitcher', {

		init: function (table) {
			this._super(table);
			this.mouseOutTimeoutId = null;
		},

		render: function ($el) {
			if ($el) this.el = $el;
			var $layout = $(this.tpl(this));
			this.el.html($layout);
			this._attachEvents();
		},

		_attachEvents: function () {
			var namespace = '.' + this.name;
			this.el.off(namespace);
			this.el.on('click' + namespace, '.pages-dropdown-btn', this._onDropdownClick.bind(this));
			this.el.on('click' + namespace, 'a', this._onPageClick.bind(this));
			this.el.on('mouseleave' + namespace, this._onMouseleave.bind(this));
			this.el.on('mouseenter' + namespace, this._onMouseenter.bind(this));
		},

		_receive: function (eventName, data) {
			this._super(eventName, data);
			switch (eventName) {
				case 'dataChange':
				case 'filter':
				case 'pageSwitch':
					this.render();
					break;
			}
		},

		_onDropdownClick: function (e) {
			e.preventDefault();
			this.el.find('.pages-dropdown').toggle();
		},

		_onPageClick: function (e) {
			e.preventDefault();
			var page = $(e.currentTarget).attr('rel');
			if (!page) return;
			this.table.switchPage(page);
		},

		_onMouseleave: function () {
			this.mouseOutTimeoutId = setTimeout(function () {
				this.el.find('.pages-dropdown').hide();
			}.bind(this), MOUSEOUT_TIMEOUT);
		},

		_onMouseenter: function () {
			clearTimeout(this.mouseOutTimeoutId);
		}

	});


	ActiveTable.getWidget('pageSwitcher').installTemplate(function (widget) {
		var pagesDropdown = '';
		var page = widget.table.page
		var pagesCnt =  widget.table.perPage ? Math.ceil(widget.table.rowsCnt / widget.table.perPage) : 1;
		for (var i = 1; i <=  pagesCnt ; i++) {
			pagesDropdown += '<a href="#" class="' + (page == i ? 'current-page' : '') + '" rel="' + i + '">' + i + '</a>';
		}
		var canPrev = page == 1 ? 'pages-disabled' : '';
		var canNext = page == pagesCnt ? 'pages-disabled': '';

		return '<div>' +
			'<a class="at-button pages-prev ' + canPrev + '" rel="prev" href="#"><div class="at-icon at-left"></div></a>' +
			'<a class="at-button pages-dropdown-btn">' + widget.table.page + '<div class="at-icon at-down"></div></a>' +
			'<a class="at-button pages-next ' + canNext + '" rel="next" href="#"><div class="at-icon at-right"></div></a>' +
			'<div class="pages-dropdown">' + pagesDropdown + '</div>' +
		'</div>';
	});

} (ActiveTable)
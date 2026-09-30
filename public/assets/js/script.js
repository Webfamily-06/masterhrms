/*
Author       : Dreams Technologies
Template Name: Dreams ERP - Tailwind Admin Dashboard
*/
(function() {
	"use strict";

	var wrapper = document.querySelector(".main-wrapper");
	var overlay = document.createElement("div");
	overlay.className = "sidebar-overlay";
	if (wrapper && wrapper.parentNode) {
		wrapper.parentNode.insertBefore(overlay, wrapper);
	}

	// Sidebar
	function setSidebarActiveByUrl() {
		var path = window.location.pathname;
		var page = path.split('/').pop();
		if (!page || page === '') page = 'index.html';

		var sidebar = document.querySelector('.sidebar-menu');
		if (!sidebar) return;

		sidebar.querySelectorAll('a.active, a.subdrop').forEach(function(a) {
			a.classList.remove('active', 'subdrop');
		});

		var link = sidebar.querySelector('a[href="' + page + '"]');
		var pageGroups = {
			'sales-orders': ['sales-orders.html', 'add-sales.html', 'edit-sales.html', 'sales-details.html'],
			'sales-quotes': ['sales-quotes.html', 'add-sales-quotes.html', 'edit-sales-quotes.html', 'sales-quotes-details.html'],
			'cash-sales': ['cash-sales.html', 'add-cash-sales.html', 'edit-cash-sales.html', 'cash-sales-details.html'],
			'recurring-invoices': ['recurring-invoices.html', 'add-recurring-invoice.html', 'edit-recurring-invoice.html', 'recurring-invoice-details.html'],
			'credit-notes': ['credit-notes.html', 'add-credit-notes-invoice.html', 'edit-credit-notes-invoice.html', 'credit-notes-details.html'],
			'delivery-notes': ['delivery-notes.html', 'add-delivery-notes-invoice.html', 'edit-delivery-notes-invoice.html', 'delivery-note-details.html'],
			'purchases': ['purchases.html', 'add-purchase.html', 'edit-purchase.html', 'purchase-details.html'],
			'purchase-orders': ['purchase-orders.html', 'add-purchase-order.html', 'edit-purchase-order.html', 'purchase-order-details.html'],
			'purchase-return': ['purchase-return.html', 'add-purchase-return.html', 'edit-purchase-return.html', 'purchase-return-details.html'],
			'employees': ['employees.html', 'employees-grid.html', 'add-employee.html', 'edit-employee.html', 'employee-details.html'],
			'projects': ['projects-grid.html', 'projects.html', 'project-details.html', 'project-dashboard.html', 'project-analytics.html'],
			'tasks': ['tasks.html', 'tasks-grid.html', 'task-details.html'],
			'payroll': ['payroll.html', 'add-payroll.html', 'edit-payroll.html'],
			'recruitment': ['recruitment.html', 'add-job-requisition.html', 'edit-job-requisition.html'],
			'contacts': ['contacts.html', 'contacts-grid.html', 'contact-details.html'],
			'leads': ['leads.html', 'leads-grid.html', 'lead-details.html'],
			'deals': ['deals.html', 'deals-grid.html', 'deal-details.html'],
			'membership-plans': ['membership-plans.html', 'add-membership-plan.html'],
			'products': ['add-product.html', 'edit-product.html'],
			'knowledge-base': ['knowledge-base.html', 'knowledge-base-details.html'],
			'recruitment': ['recruitment.html', 'add-job-requisition.html', 'edit-job-requisition', 'candidate-pipline.html', 'interview-scheduler.html','offer-management.html', 'onboarding.html'],
			'general-settings': ['general-settings.html', 'security-settings.html', 'notifications-settings.html', 'integrations-settings.html'],
			'workflow-approvals': ['workflow-approvals.html', 'workflow-approval-levels.html', 'workflow-requests.html', 'workflow-actions.html']
		};

		if (!link) {
			var groupKey = Object.keys(pageGroups).find(function(key) {
				return pageGroups[key].includes(page);
			});
			if (groupKey) {
				link = sidebar.querySelector('a[data-sidebar-group="' + groupKey + '"]') || sidebar.querySelector('a[href="' + groupKey + '.html"]');
			}
		}

		if (!link) return;
		link.classList.add('active');

		var isMini = document.body.classList.contains('mini-sidebar');

		var node = link.parentElement;
		while (node && node !== sidebar) {
			if (node.tagName === 'LI' && node.classList.contains('submenu')) {
				var parentA = node.querySelector(':scope > a');
				if (parentA) parentA.classList.add('subdrop');
				var parentUl = node.querySelector(':scope > ul');
				// In mini-sidebar, let the hover handler control display; in normal mode, show the parent
				if (parentUl && !isMini) parentUl.style.display = 'block';
			}
			node = node.parentElement;
		}
	}

	function initSidebarMenu() {
		document.querySelectorAll(".sidebar-menu a").forEach(function(link) {
			link.addEventListener("click", function(e) {
				var submenu = this.nextElementSibling;
				var parent = this.parentElement;

				if (parent.classList.contains("submenu")) {
					e.preventDefault();

					if (!this.classList.contains("subdrop")) {
						var parentUl = this.closest("ul");
						parentUl.querySelectorAll("ul").forEach(function(ul) {
							ul.style.display = "none";
						});
						parentUl.querySelectorAll("a.subdrop").forEach(function(a) {
							a.classList.remove("subdrop");
						});

						if (submenu && submenu.tagName === "UL") {
							submenu.style.display = "block";
						}
						this.classList.add("subdrop");
					} else {
						this.classList.remove("subdrop");
						if (submenu && submenu.tagName === "UL") {
							submenu.style.display = "none";
						}
					}
				}
			});
		});

		var isMini = document.body.classList.contains('mini-sidebar');

		document.querySelectorAll(".sidebar-menu ul li.submenu a.active").forEach(function(activeLink) {
			var parentUl = activeLink.closest("ul");
			var parentLink = parentUl ? parentUl.previousElementSibling : null;
			if (parentLink && parentLink.tagName === "A") {
				parentLink.classList.add("active", "subdrop");
				// In mini-sidebar, let the hover handler control display; in normal mode, show the parent
				if (parentUl && !isMini) parentUl.style.display = "block";
			}
		});
	}

	// Initialize Sidebar
	initSidebarMenu();
	setSidebarActiveByUrl();

	// Mouse Over
	document.addEventListener("mouseover", function(e) {
		e.stopPropagation();
		var body = document.body;
		var toggleBtn = document.getElementById("toggle_btn");
		if (body.classList.contains("mini-sidebar") && toggleBtn && toggleBtn.offsetParent !== null) {
			var targ = e.target.closest(".sidebar, .header-left");
			if (targ) {
				body.classList.add("expand-menu");
				document.querySelectorAll(".subdrop + ul").forEach(function(ul) {
					ul.style.display = "block";
				});
			} else {
				body.classList.remove("expand-menu");
				document.querySelectorAll(".subdrop + ul").forEach(function(ul) {
					ul.style.display = "none";
				});
			}
			e.preventDefault();
		}
	});

	// Toggle Button
	document.addEventListener("click", function(e) {
		var btn = e.target.closest("#toggle_btn, #toggle_btn2");
		if (!btn) return;
		e.preventDefault();
		e.stopPropagation();

		var body = document.body;
		var html = document.documentElement;
		var isMini = body.classList.contains("mini-sidebar");
		var isFullWidth = html.getAttribute("data-layout") === "full-width";
		var isHidden = html.getAttribute("data-layout") === "hidden";

		if (isMini) {
			body.classList.remove("mini-sidebar");
			btn.classList.add("active");
			localStorage.setItem("screenModeNightTokenState", "night");
			requestAnimationFrame(function() {
				document.querySelectorAll(".header-left").forEach(function(el) {
					el.classList.add("active");
				});
			});
		} else {
			body.classList.add("mini-sidebar");
			btn.classList.remove("active");
			localStorage.removeItem("screenModeNightTokenState");
			requestAnimationFrame(function() {
				document.querySelectorAll(".header-left").forEach(function(el) {
					el.classList.remove("active");
				});
			});
		}

		// If <html> has data-layout="full-width", apply full-width class to <body>
		if (isFullWidth) {
			body.classList.add("full-width");
			body.classList.remove("mini-sidebar");
			var sidebarOverlay = document.querySelector(".sidebar-overlay");
			if (sidebarOverlay) sidebarOverlay.classList.add("opened");
		} else {
			body.classList.remove("full-width");
		}

		// If <html> has data-layout="hidden", apply hidden-layout class to <body>
		if (isHidden) {
			body.classList.toggle("hidden-layout");
			body.classList.remove("mini-sidebar");
		}
	});

	// Store the initial layout
	const htmlElement = document.documentElement;
	const initialLayout = htmlElement.getAttribute('data-layout') || '';

	// Sidebar remove & manage layout in mobile/desktop toggle
	window.addEventListener('resize', function() {
		const currentWidth = window.innerWidth;

		if (currentWidth <= 991) {
			// 1. Mobile Cleanup (<= 991px)
			document.body.classList.remove('mini-sidebar');
			
			// Remove layouts that shouldn't display on mobile view
			const currentLayout = htmlElement.getAttribute('data-layout');
			if (currentLayout === 'full-width' || currentLayout === 'hidden') {
				htmlElement.removeAttribute('data-layout');
			}
		} else {
			// If it was originally full-width or hidden, restore it when screen goes back up
			if (!htmlElement.hasAttribute('data-layout')) {
				if (initialLayout === 'full-width' || initialLayout === 'hidden') {
					htmlElement.setAttribute('data-layout', initialLayout);
				}
			}
		}
	});

	// Sidebar close handler
	document.addEventListener("click", function(e) {
		if (e.target.closest(".sidebar-close") || e.target.closest(".sidebar-overlay")) {
			document.body.classList.remove("full-width");
		}
	});

	// Sidebar
	function colinit() {
		document.querySelectorAll(".sidebar-right ul a").forEach(function(link) {
			link.addEventListener("click", function(e) {
				var parentLi = this.parentElement;

				if (parentLi.classList.contains("submenu")) {
					e.preventDefault();
				}

				if (!this.classList.contains("subdrop")) {
					var parentUl = this.closest("ul");
					parentUl.querySelectorAll("ul").forEach(function(ul) {
						ul.style.display = "none";
					});
					parentUl.querySelectorAll("a").forEach(function(a) {
						a.classList.remove("subdrop");
					});
					var nextUl = this.nextElementSibling;
					if (nextUl && nextUl.tagName === "UL") {
						nextUl.style.display = "block";
					}
					this.classList.add("subdrop");
				} else {
					this.classList.remove("subdrop");
					var nextUl = this.nextElementSibling;
					if (nextUl && nextUl.tagName === "UL") {
						nextUl.style.display = "none";
					}
				}
			});
		});

		// Open parent menus for active submenu
		document.querySelectorAll(".sidebar-right ul li.submenu a.active").forEach(function(activeLink) {
			var li = activeLink.closest("li.submenu");
			while (li) {
				var firstLink = li.querySelector("a");
				if (firstLink) firstLink.classList.add("subdrop");
				var submenu = firstLink ? firstLink.nextElementSibling : null;
				if (submenu && submenu.tagName === "UL") submenu.style.display = "block";
				li = li.parentElement ? li.parentElement.closest("li.submenu") : null;
			}
		});
	}
	colinit();

	// Notification
	document.addEventListener('DOMContentLoaded', function () {
		const toggle = document.getElementById('read');
		const allContent = document.getElementById('all-notifications');
		const unreadContent = document.getElementById('unread-only');
		const track = document.getElementById('switch-track');
		const thumb = document.getElementById('switch-thumb');

		if (toggle && allContent && unreadContent) {
			toggle.addEventListener('change', function () {
				if (this.checked) {
					// Show Unread view
					allContent.classList.add('hidden');
					unreadContent.classList.remove('hidden');
					
					// Visual Switch State
					if(track) track.classList.add('bg-primary');
					if(thumb) thumb.classList.add('translate-x-full');
				} else {
					// Show All view
					allContent.classList.remove('hidden');
					unreadContent.classList.add('hidden');
					
					// Visual Switch State
					if(track) track.classList.remove('bg-primary');
					if(thumb) thumb.classList.remove('translate-x-full');
				}
			});
		}
	});

	document.addEventListener('DOMContentLoaded', function () {
		const closeBtn = document.getElementById('close-notification');
		const dropdownParent = document.getElementById('notification-dropdown');

		if (closeBtn && dropdownParent) {
			closeBtn.addEventListener('click', function() {
				if (window.HSDropdown) {
					window.HSDropdown.close(dropdownParent);
				}
			});
		}
	});

	// Initialize Flatpickr on elements with data-provider="flatpickr"
	document.querySelectorAll('[data-provider="flatpickr"]').forEach((el) => {
		const config = {
			disableMobile: true,
		};

		// --- 1. Handle Wrap Mode ---
		if (el.getAttribute("data-wrap") === "true") {
			config.wrap = true;

			// Crucial: This manually updates the <span> text
			config.onChange = function(selectedDates, dateStr, instance) {
				// Find the span INSIDE the current picker container
				const displaySpan = instance.element.querySelector('[data-input-span]');
				if (displaySpan) {
					displaySpan.textContent = dateStr;
				}
			};
		}

		if (el.hasAttribute("data-date-format")) {
			config.dateFormat = el.getAttribute("data-date-format");
		}
		if (el.hasAttribute("data-enable-time")) {
			config.enableTime = true;
			config.dateFormat = config.dateFormat ?
				`${config.dateFormat} H:i` :
				"Y-m-d H:i";
		}
		if (el.hasAttribute("data-altFormat")) {
			config.altInput = true;
			config.altFormat = el.getAttribute("data-altFormat");
		}
		if (el.hasAttribute("data-minDate")) {
			config.minDate = el.getAttribute("data-minDate");
		}
		if (el.hasAttribute("data-maxDate")) {
			config.maxDate = el.getAttribute("data-maxDate");
		}
		if (el.hasAttribute("data-default-date")) {
			const defaultDate = el.getAttribute("data-default-date");
			// Check if it's a valid date string
			if (
				!["true", "false", "", null].includes(defaultDate) &&
				!isNaN(Date.parse(defaultDate))
			) {
				config.defaultDate = defaultDate;
			}
		}
		if (el.hasAttribute("data-multiple-date")) {
			config.mode = "multiple";
		}
		if (el.hasAttribute("data-range-date")) {
			config.mode = "range";
		}
		if (el.hasAttribute("data-inline-date")) {
			config.inline = true;
			const inlineDate = el.getAttribute("data-inline-date");
			if (
				!["true", "false", "", null].includes(inlineDate) &&
				!isNaN(Date.parse(inlineDate))
			) {
				config.defaultDate = inlineDate;
			}
		}
		if (el.hasAttribute("data-disable-date")) {
			config.disable = el.getAttribute("data-disable-date").split(",");
		}
		if (el.hasAttribute("data-week-number")) {
			config.weekNumbers = true;
		}
		flatpickr(el, config);
	});

	// Time Picker
	document.querySelectorAll('[data-provider="timepickr"]').forEach((item) => {
		const attrs = item.attributes;
		const config = {
			enableTime: true,
			noCalendar: true,
			dateFormat: "H:i",
		};

		if (attrs["data-time-hrs"]) {
			config.time_24hr = true;
		}

		if (attrs["data-min-time"]) {
			config.minTime = attrs["data-min-time"].value;
		}

		if (attrs["data-max-time"]) {
			config.maxTime = attrs["data-max-time"].value;
		}

		if (attrs["data-default-time"]) {
			config.defaultDate = attrs["data-default-time"].value;
		}

		if (attrs["data-time-inline"]) {
			config.inline = true;
			config.defaultDate = attrs["data-time-inline"].value;
		}

		flatpickr(item, config);
	});

	// Choices
	function initChoices() {
		document.querySelectorAll("[data-choices]").forEach((item) => {
			const config = {
				allowHTML: true,
			};
			const attrs = item.attributes;

			if (attrs["data-choices-groups"]) {
				config.placeholderValue = "This is a placeholder set in the config";
			}
			if (attrs["data-choices-search-false"]) {
				config.searchEnabled = false;
			}
			if (attrs["data-choices-search-true"]) {
				config.searchEnabled = true;
			}
			if (attrs["data-choices-removeItem"]) {
				config.removeItemButton = true;
			}
			if (attrs["data-choices-sorting-false"]) {
				config.shouldSort = false;
			}
			if (attrs["data-choices-sorting-true"]) {
				config.shouldSort = true;
			}
			if (attrs["data-choices-multiple-remove"]) {
				config.removeItemButton = true;
			}
			if (attrs["data-choices-limit"]) {
				config.maxItemCount = parseInt(attrs["data-choices-limit"].value);
			}
			if (attrs["data-choices-editItem-true"]) {
				config.editItems = true;
			}
			if (attrs["data-choices-editItem-false"]) {
				config.editItems = false;
			}
			if (attrs["data-choices-text-unique-true"]) {
				config.duplicateItemsAllowed = false;
			}
			if (attrs["data-choices-text-disabled-true"]) {
				config.addItems = false;
			}

			const instance = new Choices(item, config);

			if (attrs["data-choices-text-disabled-true"]) {
				instance.disable();
			}
		});
	}

	// Call it when the DOM is ready
	document.addEventListener("DOMContentLoaded", initChoices);

	// Full Screen
	if (document.querySelector(".btnFullscreen")) {
		const toggleFullscreen = function() {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
			} else {
				if (document.exitFullscreen) {
					document.exitFullscreen();
				}
			}
		};
		document.querySelectorAll(".btnFullscreen").forEach(function(btn) {
			btn.addEventListener("click", toggleFullscreen);
		});
	}

	// Alert Close Button (vanilla JS)
	document.querySelectorAll(".close-alert-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const alert = btn.closest('[role="alert"]');
			if (!alert) return;
			// Optional: simple fade-out using CSS class, or remove immediately
			alert.remove();
		});
	});

	// Toggle Mobile Menu (#menu_btn, #mobile_btn) - vanilla JS wrapper
	document.addEventListener("click", function(e) {
		const menuBtn =
			e.target.closest("#menu_btn") || e.target.closest("#mobile_btn");
		const sidebarClose = e.target.closest(".sidebar-close");
		const sidebarOverlayClick = e.target.closest(".sidebar-overlay");

		// Cached elements
		const wrapperEl = document.querySelector(".main-wrapper");
		const overlayEl = document.querySelector(".sidebar-overlay");
		const htmlEl = document.documentElement;

		if (menuBtn) {
			e.preventDefault();
			if (wrapperEl) wrapperEl.classList.toggle("slide-nav");
			if (overlayEl) overlayEl.classList.toggle("opened");
			htmlEl.classList.toggle("menu-opened");
		}

		if (sidebarClose || sidebarOverlayClick) {
			if (wrapperEl) wrapperEl.classList.remove("slide-nav");
			if (overlayEl) overlayEl.classList.remove("opened");
			htmlEl.classList.remove("menu-opened");
		}
	});

	// Show code preview
	document.addEventListener("click", function(e) {
		const btn = e.target.closest('[data-toggle="code"]');
		if (!btn) return;

		const card = btn.closest(".preview-card");
		const preview = card?.querySelector(".preview-content");
		const code = card?.querySelector(".code");
		const text = btn.querySelector(".code-btn");

		if (!preview || !code || !text) return;

		// Toggle visibility
		preview.classList.toggle("hidden");
		code.classList.toggle("hidden");

		// Toggle button text
		text.textContent =
			text.textContent.trim() === "Show Code" ? "Show Preview" : "Show Code";
	});

	// Copy Code
	document.addEventListener("click", function(e) {
		const copyBtn = e.target.closest("[data-copy]");
		if (!copyBtn) return;

		const code = copyBtn.closest("pre")?.querySelector("code");
		if (!code) return;

		const text = code.innerText;
		navigator.clipboard.writeText(text).then(() => {
			const span = copyBtn.querySelector("span");
			if (!span) return;

			const oldText = span.textContent;
			span.textContent = "Copied!";
			setTimeout(() => (span.textContent = oldText), 1500);
		});
	});

	document.addEventListener('DOMContentLoaded', function () {
		const masterCheckbox = document.getElementById('select-all');
		const rowCheckboxes = document.querySelectorAll('.email-checkbox');

		if (masterCheckbox) {
			// Event 1: Clicking "Select All" toggles all row checkboxes
			masterCheckbox.addEventListener('change', function () {
				const isChecked = this.checked;
				rowCheckboxes.forEach(function (checkbox) {
					checkbox.checked = isChecked;
				});
			});

			// Event 2: Unchecking a single row checkbox updates the master state
			rowCheckboxes.forEach(function (checkbox) {
				checkbox.addEventListener('change', function () {
					// Check if all individual checkboxes are currently marked true
					const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
					masterCheckbox.checked = allChecked;
					
					// Optional: Handle partial/indeterminate state
					const anyChecked = Array.from(rowCheckboxes).some(cb => cb.checked);
					masterCheckbox.indeterminate = anyChecked && !allChecked;
				});
			});
		}
	});

	document.addEventListener('DOMContentLoaded', () => {
		// Select all favorite buttons on the page
		const favButtons = document.querySelectorAll('.fav-icon');

		favButtons.forEach(button => {
			button.addEventListener('click', function() {
			// Find the icon inside the clicked button
			const icon = this.querySelector('i');
			
			if (icon) {
				// Toggle the icon fill states
				icon.classList.toggle('ph');
				icon.classList.toggle('ph-fill');
				
				// Toggle the Tailwind warning text color (yellow/gold)
				icon.classList.toggle('text-warning');
			}
			});
		});
	});

	// Add Invoice
	function initInvoiceItems() {
		const tbody = document.getElementById('invoice-items');
		const addBtn = document.getElementById('add-item-btn');

		if (!tbody || !addBtn) return;

		addBtn.addEventListener('click', function (e) {
			e.preventDefault();

			const row = `
				<tr>
					<td class="py-3 px-2 w-1/3">
						<input type="text" class="w-full px-3 py-2 text-sm border border-border-color rounded-md bg-white focus:outline-none focus:ring-0">
					</td>
					<td class="py-3 px-2">
						<div class="flex items-center border border-border-color rounded-md w-max px-2 py-1 bg-white h-[38px]">
							<button type="button" class="text-gray-500 hover:text-gray-700 px-1 cursor-pointer qty-plus">
								<i class="ph ph-plus pointer-events-none"></i>
							</button>
							<input type="text" class="w-8 text-center text-sm border-none focus:outline-none focus:ring-0 p-0 bg-transparent qty-input" value="0">
							<button type="button" class="text-gray-500 hover:text-gray-700 px-1 cursor-pointer qty-minus">
								<i class="ph ph-minus pointer-events-none"></i>
							</button>
						</div>
					</td>
					<td class="py-3 px-2">
						<input type="text" class="w-full px-3 py-2 text-sm border border-border-color rounded-md bg-white focus:outline-none focus:ring-0">
					</td>
					<td class="py-3 px-2">
						<input type="text" class="w-full px-3 py-2 text-sm border border-border-color rounded-md bg-white focus:outline-none focus:ring-0">
					</td>
					<td class="py-3 px-2">
						<input type="text" class="w-full px-3 py-2 text-sm border border-border-color rounded-md bg-white focus:outline-none focus:ring-0">
					</td>
					<td class="py-3 px-2 text-center">
						<button type="button" class="delete-item-btn size-7 bg-danger-transparent text-danger hover:bg-danger hover:text-white rounded-md inline-flex justify-center items-center cursor-pointer transition-colors">
							<i class="ph ph-trash pointer-events-none"></i>
						</button>
					</td>
				</tr>
			`;

			tbody.insertAdjacentHTML('beforeend', row);
		});

		tbody.addEventListener('click', function (e) {

			// Delete Row
			const deleteBtn = e.target.closest('.delete-item-btn');
			if (deleteBtn) {
				deleteBtn.closest('tr').remove();
				return;
			}

			// Quantity Increase
			const plusBtn = e.target.closest('.qty-plus');
			if (plusBtn) {
				const input = plusBtn.parentElement.querySelector('.qty-input');
				input.value = (parseInt(input.value) || 0) + 1;
				return;
			}

			// Quantity Decrease
			const minusBtn = e.target.closest('.qty-minus');
			if (minusBtn) {
				const input = minusBtn.parentElement.querySelector('.qty-input');
				input.value = Math.max(0, (parseInt(input.value) || 0) - 1);
			}
		});
	}

	document.addEventListener('DOMContentLoaded', initInvoiceItems);


	// Pos page Product select
	document.addEventListener('DOMContentLoaded', function () {
			const productGrid = document.getElementById('pos-product-grid');
			if (!productGrid) return;

			// --- Product Card Selection ---
			productGrid.addEventListener('click', function (e) {
				const card = e.target.closest('.pos-product-card,.pos-product-card-1');
				if (!card) return;

				// Ignore clicks on quantity buttons
				if (e.target.closest('.qty-btn')) return;

				card.classList.toggle('selected');
			});

			// --- Quantity Increment / Decrement ---
			productGrid.addEventListener('click', function (e) {
				const btn = e.target.closest('.qty-btn');
				if (!btn) return;

				e.stopPropagation();

				const card = btn.closest('.pos-product-card,.pos-product-card-1');
				const qtySpan = card.querySelector('.qty-value');
				let qty = parseInt(qtySpan.textContent, 10) || 0;

				if (btn.classList.contains('qty-minus')) {
					qty = Math.max(0, qty - 1);
				} else if (btn.classList.contains('qty-plus')) {
					qty += 1;
				}

				qtySpan.textContent = qty.toString().padStart(2, '0');

				// Auto-select card when quantity > 0, deselect when 0
				if (qty > 0) {
					card.classList.add('selected');
				} else {
					card.classList.remove('selected');
				}
			});

			// --- Category Filtering ---
			const categoryButtons = document.querySelectorAll('.category-filter');
			const productCards = document.querySelectorAll('.pos-product-card');

			categoryButtons.forEach(button => {
				button.addEventListener('click', function () {
					const selectedCategory = this.getAttribute('data-category');

					// Update active button state
					categoryButtons.forEach(btn => {
						btn.classList.remove('active', 'border-primary');
						btn.classList.add('border-border-color', 'bg-white', 'text-gray-900');
					});
					this.classList.remove('border-border-color', 'bg-white', 'text-gray-900');
					this.classList.add('active', 'border-primary');

					// Filter products
					productCards.forEach(card => {
						if (selectedCategory === 'all') {
							card.closest('.col-span-1').style.display = 'block';
						} else {
							const categorySpan = card.querySelector('span[class*="bg-"][class*="-transparent"]');
							if (categorySpan) {
								const productCategory = categorySpan.textContent.toLowerCase();
								const filterCategory = selectedCategory.toLowerCase();
								
								if (productCategory.includes(filterCategory) || filterCategory.includes(productCategory)) {
									card.closest('.col-span-1').style.display = 'block';
								} else {
									card.closest('.col-span-1').style.display = 'none';
								}
							}
						}
					});
				});
			});
	});

	// Accordian 
	document.querySelectorAll('.accordion-btn').forEach(btn => {
		btn.addEventListener('click', function () {
			const currentContent = this.nextElementSibling;
			const currentIcon = this.querySelector('i');

			document.querySelectorAll('.accordion-btn').forEach(otherBtn => {
				if (otherBtn !== this) {
					otherBtn.nextElementSibling.classList.add('hidden');
					otherBtn.querySelector('i').classList.remove('rotate-180');
				}
			});

			currentContent.classList.toggle('hidden');
			currentIcon.classList.toggle('rotate-180');
		});
	});

	// Collapse
	document.addEventListener('click', function(e) {
		const targetBtn = e.target.closest('[data-collapse-target]');
		if (targetBtn) {
			targetBtn.getAttribute('data-collapse-target').split(',').forEach(function(selector) {
				const box = document.querySelector(selector.trim());
				if (!box) return;
				box.style.maxHeight = (box.style.maxHeight && box.style.maxHeight !== '0px')
					? '0px'
					: box.scrollHeight + 'px';
			});
			return;
		}

		const btn = e.target.closest('[data-collapse-btn]');
		if (btn) {
			const card = btn.closest('.preview-content');
			const box = card ? card.querySelector('[data-collapse-box]') : null;
			if (!box) return;
			if (box.classList.contains('w-0')) {
				const content = box.firstElementChild;
				box.style.width = (box.style.width && box.style.width !== '0px')
					? '0px'
					: (content ? content.scrollWidth + 'px' : '350px');
			} else {
				box.style.maxHeight = (box.style.maxHeight && box.style.maxHeight !== '0px')
					? '0px'
					: box.scrollHeight + 'px';
			}
		}
	});

	// Sidebar Active
	window.addEventListener('load', () => {
		setTimeout(() => {
			const activeItem = document.querySelector('#sidebar-menu .active');
			const scrollElement = document.querySelector(
				'.sidebar-inner .simplebar-mask'
			)?.querySelector('.simplebar-content-wrapper');

			if (activeItem && scrollElement) {
				scrollElement.scrollTop = activeItem.offsetTop - 100;
			}
		}, 500);
	});

	// Checkbox Select Row
	document.querySelectorAll(".allow-all").forEach((master) => {
		master.addEventListener("change", function() {
			const tr = this.closest("tr");
			if (!tr) return;

			tr.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
				if (cb !== this) cb.checked = this.checked;
			});
		});
	});
	
})();
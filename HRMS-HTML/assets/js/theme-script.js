// --- EARLY THEME SETUP (prevent white flash) ---
(function () {
	const defaultTheme = "dark";
	let savedTheme = defaultTheme;

	try {
		// Read theme from localStorage or sessionStorage
		savedTheme = localStorage.getItem("data-theme") || sessionStorage.getItem("data-theme");
		
		// Fallback compatibility checking for __THEME_CONFIG__ if it exists
		if (!savedTheme) {
			const rawConfig = localStorage.getItem("__THEME_CONFIG__") || sessionStorage.getItem("__THEME_CONFIG__");
			if (rawConfig) {
				const config = JSON.parse(rawConfig);
				if (config && config.theme) {
					savedTheme = config.theme;
				}
			}
		}
	} catch (e) {
		console.warn("Theme storage read failed:", e);
	}

	if (!savedTheme) {
		savedTheme = defaultTheme;
	}

	document.documentElement.setAttribute("data-theme", savedTheme);
})();

// --- DOM CONTENT LOADED INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
	// Select initial theme from documentElement attribute
	let currentTheme = document.documentElement.getAttribute("data-theme") || "dark";

	// Function to update the icon state inside .light-dark-mode buttons
	function updateToggleButtonIcons(theme) {
		document.querySelectorAll(".light-dark-mode").forEach(btn => {
			const icon = btn.querySelector("i");
			if (icon) {
				if (theme === "dark") {
					// Switch class from ph-moon to ph-sun
					icon.classList.remove("ph-moon");
					icon.classList.add("ph-sun");
				} else {
					// Switch class from ph-sun to ph-moon
					icon.classList.remove("ph-sun");
					icon.classList.add("ph-moon");
				}
			}
		});
	}

	// Function to apply the chosen theme
	function applyTheme(theme) {
		currentTheme = theme;
		document.documentElement.setAttribute("data-theme", theme);

		try {
			// Save simple theme value to local and session storage
			localStorage.setItem("data-theme", theme);
			sessionStorage.setItem("data-theme", theme);

			// Save to __THEME_CONFIG__ for backward compatibility with layout configurations
			const config = { theme: theme };
			localStorage.setItem("__THEME_CONFIG__", JSON.stringify(config));
			sessionStorage.setItem("__THEME_CONFIG__", JSON.stringify(config));

			const label = theme === "dark" ? "Dark" : "Light";
			localStorage.setItem("__THEME_LABEL__", label);
			sessionStorage.setItem("__THEME_LABEL__", label);
		} catch (e) {
			console.warn("Theme storage write failed:", e);
		}

		// Update all light-dark-mode toggle buttons in the document
		updateToggleButtonIcons(theme);

		// Trigger global chart theme refresh if available
		if (typeof window.refreshChartThemes === "function") {
			setTimeout(() => {
				window.refreshChartThemes();
			}, 50);
		}
	}

	// Set initial icons matching the active theme
	updateToggleButtonIcons(currentTheme);

	// Setup delegated click listener for .light-dark-mode elements
	document.addEventListener("click", (e) => {
		const targetBtn = e.target.closest(".light-dark-mode");
		if (targetBtn) {
			const nextTheme = currentTheme === "dark" ? "light" : "dark";
			applyTheme(nextTheme);
		}
	});
});

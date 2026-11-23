"use client";

import { useEffect } from "react";

export function DashboardDropdownHandler() {
  useEffect(() => {
    let isSyncing = false;

    // Synchronize dark/light theme attributes across html, body and all .dashboard-scope containers
    function syncTheme() {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const isDark =
          document.documentElement.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark" ||
          (typeof window !== "undefined" && localStorage.getItem("theme") === "dark");
        const theme = isDark ? "dark" : "light";

        if (document.documentElement.getAttribute("data-theme") !== theme) {
          document.documentElement.setAttribute("data-theme", theme);
        }
        if (document.documentElement.getAttribute("data-theme-mode") !== theme) {
          document.documentElement.setAttribute("data-theme-mode", theme);
        }
        if (isDark && !document.documentElement.classList.contains("dark")) {
          document.documentElement.classList.add("dark");
        } else if (!isDark && document.documentElement.classList.contains("dark")) {
          document.documentElement.classList.remove("dark");
        }
        document.querySelectorAll(".dashboard-scope").forEach((el) => {
          if (el.getAttribute("data-theme") !== theme) {
            el.setAttribute("data-theme", theme);
          }
          if (el.getAttribute("data-theme-mode") !== theme) {
            el.setAttribute("data-theme-mode", theme);
          }
        });
      } finally {
        setTimeout(() => {
          isSyncing = false;
        }, 50);
      }
    }

    syncTheme();

    const observer = new MutationObserver((mutations) => {
      if (isSyncing) return;
      for (const mutation of mutations) {
        if (mutation.attributeName === "class" || mutation.attributeName === "data-theme") {
          syncTheme();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    // Process any export items currently in DOM to inject SVG images if missing
    function injectSvgIcons() {
      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        const items = menu.querySelectorAll("a, button, .dropdown-item");
        items.forEach((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          if (
            (text.includes("export as pdf") || el.querySelector(".ti-file-type-pdf")) &&
            !el.querySelector('img[src*="pdf"]')
          ) {
            const icon = el.querySelector(".ti-file-type-pdf, .fa-file-pdf, i");
            if (icon) icon.remove();
            const img = document.createElement("img");
            img.src = "/pdf.svg";
            img.alt = "PDF";
            img.className = "me-2";
            img.style.width = "18px";
            img.style.height = "18px";
            img.style.objectFit = "contain";
            img.style.verticalAlign = "middle";
            el.prepend(img);
          }
          if (
            (text.includes("export as excel") ||
              text.includes("export as xls") ||
              el.querySelector(".ti-file-type-xls")) &&
            !el.querySelector('img[src*="excel"]')
          ) {
            const icon = el.querySelector(".ti-file-type-xls, .fa-file-excel, i");
            if (icon) icon.remove();
            const img = document.createElement("img");
            img.src = "/excel.svg";
            img.alt = "Excel";
            img.className = "me-2";
            img.style.width = "18px";
            img.style.height = "18px";
            img.style.objectFit = "contain";
            img.style.verticalAlign = "middle";
            el.prepend(img);
          }
        });
      });
    }

    injectSvgIcons();

    function handleDocumentClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Tab switching handler for pills, nav-tabs, and day-active-items
      const tabLink = target.closest('[data-bs-toggle="tab"], .nav-tabs .nav-link, .day-active-item .day, .day-active-item button') as HTMLElement | null;
      if (tabLink) {
        const dayGroup = tabLink.closest(".day-active-item");
        if (dayGroup) {
          dayGroup.querySelectorAll(".day, button").forEach((b) => b.classList.remove("active"));
          tabLink.classList.add("active");
        }
        const navTabs = tabLink.closest(".nav-tabs");
        if (navTabs) {
          e.preventDefault();
          navTabs.querySelectorAll(".nav-link").forEach((link) => {
            link.classList.remove("active");
            link.setAttribute("aria-selected", "false");
          });
          tabLink.classList.add("active");
          tabLink.setAttribute("aria-selected", "true");
          const targetSelector = tabLink.getAttribute("data-bs-target") || tabLink.getAttribute("href");
          if (targetSelector && targetSelector.startsWith("#")) {
            const parentContainer = navTabs.closest(".card, .card-body") || document;
            const targetPane = parentContainer.querySelector(targetSelector);
            if (targetPane) {
              const tabContent = targetPane.closest(".tab-content");
              if (tabContent) {
                tabContent.querySelectorAll(".tab-pane").forEach((pane) => {
                  pane.classList.remove("show", "active");
                });
              }
              targetPane.classList.add("show", "active");
            }
          }
        }
      }

      // 2. Dropdown menu toggle button
      const toggleBtn = target.closest(
        '[data-bs-toggle="dropdown"], .dropdown-toggle'
      ) as HTMLElement | null;

      if (toggleBtn) {
        if (toggleBtn.tagName === "A" && (toggleBtn.getAttribute("href")?.startsWith("#") || toggleBtn.getAttribute("href") === "javascript:void(0);")) {
          e.preventDefault();
        }

        const container = toggleBtn.closest(".dropdown, .btn-group, .nav-item");
        if (container) {
          const menu = container.querySelector(".dropdown-menu") as HTMLElement | null;
          if (menu) {
            const isCurrentlyShown = menu.classList.contains("show");

            // Close all other open dropdowns
            document.querySelectorAll(".dropdown-menu.show").forEach((openMenu) => {
              openMenu.classList.remove("show");
              (openMenu as HTMLElement).style.display = "";
              const prevToggle = openMenu.closest(".dropdown, .btn-group, .nav-item")?.querySelector(".dropdown-toggle");
              prevToggle?.classList.remove("show");
            });

            // Toggle this menu
            if (!isCurrentlyShown) {
              injectSvgIcons();
              menu.classList.add("show");
              toggleBtn.classList.add("show");
              menu.style.display = "block";
              menu.style.position = "absolute";
              menu.style.top = "100%";
              menu.style.zIndex = "1050";

              if (menu.classList.contains("dropdown-menu-end")) {
                menu.style.right = "0";
                menu.style.left = "auto";
              }

              // Prevent screen overflow on mobile
              requestAnimationFrame(() => {
                const rect = menu.getBoundingClientRect();
                if (rect.right > window.innerWidth - 10) {
                  menu.style.right = "0";
                  menu.style.left = "auto";
                }
                if (rect.left < 10) {
                  menu.style.left = "0";
                  menu.style.right = "auto";
                }
              });
            } else {
              menu.style.display = "";
            }
            return;
          }
        }
      }

      // 3. Export items inside dropdowns
      const exportItem = target.closest(".dropdown-item") as HTMLElement | null;
      if (exportItem) {
        const text = exportItem.textContent?.trim().toLowerCase() || "";
        const isPdf = text.includes("export as pdf") || exportItem.querySelector(".ti-file-type-pdf") || exportItem.querySelector('img[src*="pdf"]');
        const isExcel = text.includes("export as excel") || text.includes("export as xls") || exportItem.querySelector(".ti-file-type-xls") || exportItem.querySelector('img[src*="excel"]');

        if (isPdf) {
          e.preventDefault();
          window.print();
        } else if (isExcel) {
          e.preventDefault();
          const rows = [
            ["Report", "Dashboard Export"],
            ["Date", new Date().toLocaleDateString()],
            ["Status", "Generated Successfully"],
          ];
          const csvContent =
            "data:text/csv;charset=utf-8," +
            rows.map((r) => r.join(",")).join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `dashboard_export_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        const parentMenu = exportItem.closest(".dropdown-menu");
        if (parentMenu) {
          parentMenu.classList.remove("show");
          (parentMenu as HTMLElement).style.display = "";
          const prevToggle = parentMenu.closest(".dropdown, .btn-group, .nav-item")?.querySelector(".dropdown-toggle");
          prevToggle?.classList.remove("show");
        }
        return;
      }

      // Clicked outside any open dropdown -> close all
      document.querySelectorAll(".dropdown-menu.show").forEach((openMenu) => {
        if (!openMenu.contains(target)) {
          openMenu.classList.remove("show");
          (openMenu as HTMLElement).style.display = "";
          const prevToggle = openMenu.closest(".dropdown, .btn-group, .nav-item")?.querySelector(".dropdown-toggle");
          prevToggle?.classList.remove("show");
        }
      });
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        document.querySelectorAll(".dropdown-menu.show").forEach((openMenu) => {
          openMenu.classList.remove("show");
          (openMenu as HTMLElement).style.display = "";
          const prevToggle = openMenu.closest(".dropdown, .btn-group, .nav-item")?.querySelector(".dropdown-toggle");
          prevToggle?.classList.remove("show");
        });
      }
    }

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}

export default DashboardDropdownHandler;

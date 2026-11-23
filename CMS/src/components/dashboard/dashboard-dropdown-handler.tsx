"use client";

import { useEffect } from "react";

export function DashboardDropdownHandler() {
  useEffect(() => {
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

    // Run icon injection once initially
    injectSvgIcons();

    function handleDocumentClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if clicking inside a toggle button
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

            // Close all open dropdowns first
            document.querySelectorAll(".dropdown-menu.show").forEach((openMenu) => {
              openMenu.classList.remove("show");
              (openMenu as HTMLElement).style.display = "";
              const prevToggle = openMenu.closest(".dropdown, .btn-group, .nav-item")?.querySelector(".dropdown-toggle");
              prevToggle?.classList.remove("show");
            });

            // Toggle this menu if it wasn't open
            if (!isCurrentlyShown) {
              // Ensure icons are injected
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
            } else {
              menu.style.display = "";
            }
            return;
          }
        }
      }

      // Check if clicking on an export item inside a dropdown
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

        // Close dropdown after selection
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
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}

export default DashboardDropdownHandler;

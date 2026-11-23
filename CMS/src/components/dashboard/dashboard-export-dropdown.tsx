"use client";

import React, { useState, useRef, useEffect } from "react";

interface DashboardExportDropdownProps {
  title?: string;
  className?: string;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
}

export function DashboardExportDropdown({
  title = "Export",
  className = "",
  onExportPdf,
  onExportExcel,
}: DashboardExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handlePdfClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (onExportPdf) {
      onExportPdf();
    } else {
      window.print();
    }
  };

  const handleExcelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (onExportExcel) {
      onExportExcel();
    } else {
      // Default CSV/Excel export action: generate a table export or summary CSV
      const rows = [
        ["Report", title || "Dashboard Export"],
        ["Date", new Date().toLocaleDateString()],
        ["Status", "Generated Successfully"],
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${(title || "dashboard").toLowerCase().replace(/\s+/g, "_")}_export.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`dropdown position-relative me-2 mb-2 ${className}`}
      style={{ display: "inline-block" }}
    >
      <button
        type="button"
        className={`dropdown-toggle btn btn-white d-inline-flex align-items-center ${
          isOpen ? "show" : ""
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <i className="ti ti-file-export me-1"></i>
        {title}
      </button>
      <ul
        className={`dropdown-menu dropdown-menu-end p-2 shadow-sm ${
          isOpen ? "show" : ""
        }`}
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          zIndex: 1050,
          minWidth: "185px",
          display: isOpen ? "block" : "none",
        }}
      >
        <li>
          <a
            href="#export-pdf"
            onClick={handlePdfClick}
            className="dropdown-item rounded-1 d-flex align-items-center py-2 px-3"
            style={{ cursor: "pointer", fontSize: "13px" }}
          >
            <img
              src="/pdf.svg"
              alt="PDF"
              className="me-2"
              style={{ width: "18px", height: "18px", objectFit: "contain" }}
            />
            <span>Export as PDF</span>
          </a>
        </li>
        <li>
          <a
            href="#export-excel"
            onClick={handleExcelClick}
            className="dropdown-item rounded-1 d-flex align-items-center py-2 px-3"
            style={{ cursor: "pointer", fontSize: "13px" }}
          >
            <img
              src="/excel.svg"
              alt="Excel"
              className="me-2"
              style={{ width: "18px", height: "18px", objectFit: "contain" }}
            />
            <span>Export as Excel</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
export default DashboardExportDropdown;

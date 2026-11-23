"use client";

import React, { useState, useMemo } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: "Active" | "On Leave" | "Probation";
  joinedDate: string;
}

export default function DataTablesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof EmployeeRecord>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const rawData: EmployeeRecord[] = [
    { id: "EMP-101", name: "Aaron Smith", email: "a.smith@masterhrms.com", department: "Engineering", role: "Frontend Dev", status: "Active", joinedDate: "2024-03-15" },
    { id: "EMP-102", name: "Bianca Vance", email: "b.vance@masterhrms.com", department: "Product", role: "Product Manager", status: "Active", joinedDate: "2023-11-01" },
    { id: "EMP-103", name: "Charles Leclerc", email: "c.leclerc@masterhrms.com", department: "Operations", role: "Logistics Lead", status: "Active", joinedDate: "2024-01-10" },
    { id: "EMP-104", name: "Diana Prince", email: "d.prince@masterhrms.com", department: "Legal", role: "Compliance Counsel", status: "Active", joinedDate: "2022-08-20" },
    { id: "EMP-105", name: "Ethan Hunt", email: "e.hunt@masterhrms.com", department: "Security", role: "Security Auditor", status: "On Leave", joinedDate: "2023-05-12" },
    { id: "EMP-106", name: "Fiona Gallagher", email: "f.gallagher@masterhrms.com", department: "Finance", role: "Staff Accountant", status: "Active", joinedDate: "2024-06-01" },
    { id: "EMP-107", name: "George Clark", email: "g.clark@masterhrms.com", department: "Engineering", role: "Backend Engineer", status: "Probation", joinedDate: "2026-10-15" },
    { id: "EMP-108", name: "Hannah Abbott", email: "h.abbott@masterhrms.com", department: "Human Resources", role: "HR Specialist", status: "Active", joinedDate: "2023-02-18" },
  ];

  // Filtering
  const filteredData = useMemo(() => {
    return rawData.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [searchQuery, departmentFilter]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortAsc]);

  const handleSort = (field: keyof EmployeeRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const pageSize = 5;
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Data Tables</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive enterprise data grid with live keyword search, column sorting, department filters, and pagination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Tables Component
          </span>
        </div>
      </div>

      <PreviewCard
        title="Interactive Employee Data Table"
        description="Type in the search bar or click table headers to test instant realtime sorting."
        code={`<div className="space-y-3">
  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." />
  <table>
    <th onClick={() => handleSort('name')}>Name {sortAsc ? '▲' : '▼'}</th>
  </table>
</div>`}
      >
        <div className="space-y-3 p-1">
          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
                <input
                  type="text"
                  placeholder="Search by name, email, or EMP ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-muted/20 border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 text-xs bg-muted/20 border border-border rounded-md text-foreground cursor-pointer"
              >
                <option value="all">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Finance">Finance</option>
                <option value="Human Resources">Human Resources</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-xs text-left text-foreground">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60 select-none">
                <tr>
                  <th className="p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("id")}>
                    ID {sortField === "id" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th className="p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                    Employee {sortField === "name" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th className="p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("department")}>
                    Department {sortField === "department" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedData.length > 0 ? (
                  paginatedData.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-mono font-semibold text-primary">{emp.id}</td>
                      <td className="p-3">
                        <span className="font-semibold text-foreground block">{emp.name}</span>
                        <span className="text-[10px] text-muted-foreground">{emp.email}</span>
                      </td>
                      <td className="p-3">{emp.department}</td>
                      <td className="p-3 text-muted-foreground">{emp.role}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            emp.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : emp.status === "On Leave"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">{emp.joinedDate}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              Showing {paginatedData.length} of {sortedData.length} total entries
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-border rounded text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-foreground">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 border border-border rounded text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}

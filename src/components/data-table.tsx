"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortValue?: (row: T) => number | string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

/** Client-side sortable table used for the analytics breakdown tables. */
export function SortableTable<T extends { key?: string; id?: string }>({
  columns,
  rows,
  initialSort,
  emptyMessage = "No data for the current filters",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;

    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === "string" || typeof bv === "string") {
        return sort.dir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "desc" };
      return { key, dir: current.dir === "desc" ? "asc" : "desc" };
    });
  };

  if (!rows.length) {
    return <p className="px-5 py-10 text-center text-xs text-ink-faint">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "table-head whitespace-nowrap px-3 py-2.5 first:pl-5 last:pr-5",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                )}
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-ink",
                      sort?.key === column.key && "text-accent",
                    )}
                  >
                    {column.header}
                    {sort?.key === column.key ? (
                      sort.dir === "desc" ? (
                        <ArrowDown size={11} />
                      ) : (
                        <ArrowUp size={11} />
                      )
                    ) : (
                      <ChevronsUpDown size={11} className="opacity-40" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={row.key ?? row.id ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "row-hover border-b border-line-soft last:border-0",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-2.5 first:pl-5 last:pr-5",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

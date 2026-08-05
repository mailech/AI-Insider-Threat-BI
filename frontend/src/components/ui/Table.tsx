import React from "react";
import { ChevronDown, ChevronUp, MoreVertical } from "lucide-react";

export function Table({ className = "", ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto bg-carbon border border-graphite">
      <table className={`w-full text-left text-body text-bone ${className}`} {...props} />
    </div>
  );
}

export function TableHeader({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-onyx ${className}`} {...props} />;
}

export function TableBody({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-graphite ${className}`} {...props} />;
}

export function TableRow({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`hover:bg-onyx transition-colors duration-150 ${className}`}
      {...props}
    />
  );
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
}

export function TableHead({ className = "", sortable, sortDirection, children, ...props }: TableHeadProps) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-sans uppercase tracking-[0.18em] text-ash font-medium align-middle ${
        sortable ? "cursor-pointer hover:text-bone transition-colors select-none" : ""
      } ${className}`}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <span className="flex flex-col">
            <ChevronUp
              className={`w-3 h-3 -mb-1 ${sortDirection === "asc" ? "text-signal-lime" : "text-fog"}`}
            />
            <ChevronDown
              className={`w-3 h-3 ${sortDirection === "desc" ? "text-signal-lime" : "text-fog"}`}
            />
          </span>
        )}
      </div>
    </th>
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  monospace?: boolean;
}

export function TableCell({ className = "", monospace, children, ...props }: TableCellProps) {
  return (
    <td
      className={`px-4 py-3 align-middle ${
        monospace ? "font-mono text-[13px] text-pearl" : "font-sans"
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-carbon border-t border-graphite ${className}`}>
      <span className="text-[11px] font-sans text-ash uppercase tracking-wider">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="text-[11px] font-sans uppercase tracking-wider text-ash hover:text-bone disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="text-[11px] font-sans uppercase tracking-wider text-ash hover:text-bone disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function TableActionMenu({
  options,
}: {
  options: { label: string; onClick: () => void; danger?: boolean }[];
}) {
  // Simple dropdown mocked with hover for now, realistically uses Headless UI / Radix
  return (
    <div className="relative group inline-block">
      <button className="p-1 rounded-sm text-fog hover:text-bone hover:bg-graphite transition-colors outline-none focus:glow-lime">
        <MoreVertical className="w-4 h-4" />
      </button>
      <div className="absolute right-0 top-full mt-1 w-32 bg-onyx border border-graphite hidden group-hover:block z-10 shadow-lg">
        <div className="py-1">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={opt.onClick}
              className={`w-full text-left px-3 py-1.5 text-body text-sm hover:bg-graphite transition-colors ${
                opt.danger ? "text-validation-error hover:text-validation-error" : "text-bone"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

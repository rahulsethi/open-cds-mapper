"use client";

import * as React from "react";
import { ColumnDef, getCoreRowModel, useReactTable, flexRender } from "@tanstack/react-table";

type Row = {
  id: string;
  name: string;
  score: number;
};

const columns: ColumnDef<Row>[] = [
  { header: "ID", accessorKey: "id" },
  { header: "Name", accessorKey: "name" },
  { header: "Score", accessorKey: "score" },
];

const data: Row[] = []; // A4: placeholder only

export default function DataTable() {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 text-left font-medium text-gray-700">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-gray-500" colSpan={columns.length}>
                No data yet. Upload CSVs once enabled.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="even:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

"use client";

export function downloadCSV(
  name: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const escape = (cell: string | number) => {
    let value = String(cell);
    if (typeof cell === "string" && /^[=+@\-]/.test(value)) value = "'" + value;
    return '"' + value.replaceAll('"', '""') + '"';
  };
  const content =
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

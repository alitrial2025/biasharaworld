import { kesMinor } from "./settlements";

export const importHeaders = {
  products: ["name", "sku", "category", "unit", "price_kes", "cost_kes", "opening_stock", "reorder_level"],
  customers: ["name", "email", "phone", "opening_balance_kes"],
} as const;
export type ImportKind = keyof typeof importHeaders;

function csvCells(row: string): string[] {
  const fields: string[] = [];
  let offset = 0;
  do {
    let value = "";
    if (row[offset] === '"') {
      offset += 1;
      let closed = false;
      while (offset < row.length) {
        const next = row[offset++];
        if (next !== '"') { value += next; continue; }
        if (row[offset] === '"') { value += '"'; offset += 1; continue; }
        closed = true;
        break;
      }
      if (!closed || (offset < row.length && row[offset] !== ",")) throw new Error("Check CSV quoting.");
    } else {
      const comma = row.indexOf(",", offset);
      const end = comma < 0 ? row.length : comma;
      value = row.slice(offset, end);
      if (value.includes('"')) throw new Error("Put quotes around the whole field.");
      offset = end;
    }
    fields.push(value.trim());
    if (offset === row.length) break;
    offset += 1;
  } while (offset <= row.length);
  return fields;
}

function quantity(value: string) {
  if (!/^\d{1,7}$/.test(value) || Number(value) > 1e6) throw new Error("Use a whole stock quantity between 0 and 1,000,000.");
  return Number(value);
}

export function businessImport(kind: ImportKind, csv: string) {
  const headers = importHeaders[kind];
  const [heading, ...records] = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (csvCells(heading).join(",").toLowerCase() !== headers.join(",")) {
    throw new Error(`Use these headings in order: ${headers.join(", ")}.`);
  }
  const rows = records.flatMap((row, index) => row.trim() ? [{ line: index + 2, row }] : []);
  if (rows.length < 1 || rows.length > 100) throw new Error("Import between 1 and 100 records at a time.");

  return rows.map(({ line, row }) => {
    try {
      const fields = csvCells(row);
      if (fields.length !== headers.length) throw new Error("Check the number of fields.");
      if (kind === "customers") {
        const [name, email, phone, balance] = fields;
        return { line, command: { type: "addCustomer", customer: { name, email, phone, balance: kesMinor(balance) / 100, purchases: 0, color: "mint" } } };
      }
      const [name, sku, category, size, price, cost, opening, reorder] = fields;
      return { line, command: { type: "addProduct", product: {
        name, sku, category, size, price: kesMinor(price) / 100, cost: kesMinor(cost) / 100,
        stock: quantity(opening), reorder: quantity(reorder), art: 0,
      } } };
    } catch (error) {
      throw new Error(`CSV line ${line}: ${error instanceof Error ? error.message : "Check this row."}`);
    }
  });
}

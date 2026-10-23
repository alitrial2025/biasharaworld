import type { DemoState, Product } from "./data";

export type Payment = { method: string; amount: number };
export type SaleLine = {
  cost?: number;
  productId: number;
  name: string;
  quantity: number;
  unit: number;
  net: number;
  components?: { productId: number; quantity: number }[];
};
export type Basket = {
  branch?: string;
  id: number;
  name: string;
  cart: Record<number, number>;
  customer: string;
  discount: number;
  discountKind: "percent" | "fixed";
  promotion: string;
  redeem: number;
};
export type DetailedReceipt = {
  createdAt?: string;
  id: number;
  branch: string;
  customer: string;
  lines: SaleLine[];
  total: number;
  discount: number;
  payments: Payment[];
  date: string;
  earned: number;
  redeemed: number;
  returned: Record<number, number>;
  deliveryFee?: number;
};
export type Movement = {
  id: number;
  productId: number;
  branch: string;
  delta: number;
  reason: string;
  reference: string;
  date: string;
};
export type Batch = {
  id: number;
  productId: number;
  branch: string;
  code: string;
  quantity: number;
  expires: string;
};
export type Transfer = {
  id: number;
  productId: number;
  quantity: number;
  from: string;
  to: string;
  status: "Draft" | "Dispatched" | "Received" | "Cancelled";
};
export type Count = {
  id: number;
  branch: string;
  name: string;
  starting: Record<number, number>;
  counted: Record<number, number>;
  status: "Draft" | "Finalised";
  reason: string;
};
export type Document = {
  id: number;
  kind: "Quotation" | "Invoice";
  customer: string;
  branch: string;
  lines: SaleLine[];
  total: number;
  due: string;
  status: "Draft" | "Issued locally" | "Paid locally";
  saleId?: number;
};
export type CustomerOrder = {
  id: number;
  customer: string;
  branch: string;
  lines: SaleLine[];
  fee: number;
  total: number;
  address: string;
  status:
    | "New"
    | "Confirmed"
    | "Packing"
    | "Dispatched"
    | "Delivered"
    | "Cancelled";
  paid: boolean;
  packed: number[];
  events: string[];
};
export type Operations = {
  version: 2;
  activeBranch: string;
  branches: { id: string; name: string; location: string }[];
  stock: Record<string, Record<number, number>>;
  cart: Record<number, number>;
  customer: string;
  discount: number;
  discountKind: "percent" | "fixed";
  promotion: string;
  redeem: number;
  held: Basket[];
  receipts: DetailedReceipt[];
  returns: {
    id: number;
    saleId: number;
    createdAt?: string;
    productId: number;
    quantity: number;
    amount: number;
    restock: boolean;
    reason: string;
    date: string;
    payments: Payment[];
  }[];
  promotions: {
    id: number;
    name: string;
    percent: number;
    ends: string;
    productId: number | null;
  }[];
  documents: Document[];
  registers: {
    id: number;
    branch: string;
    opening: number;
    status: "Open" | "Closed";
    entries: { label: string; amount: number }[];
    counted?: number;
    expected?: number;
  }[];
  counts: Count[];
  batches: Batch[];
  transfers: Transfer[];
  movements: Movement[];
  deliveries: CustomerOrder[];
  loyalty: Record<string, number>;
  rewards: {
    id: number;
    customer: string;
    points: number;
    reason: string;
    date: string;
  }[];
  rewardRate: number;
  shop: {
    published: boolean;
    name: string;
    description: string;
    branch: string;
    hidden: number[];
    fee: number;
  };
  preferences: {
    language: "en" | "sw";
    theme: "light" | "dark" | "system";
    textSize: number;
  };
  sync: {
    mode: "Local only" | "Offline preview" | "Conflict preview";
    entries: {
      id: number;
      label: string;
      status: "Saved on device" | "Retry preview" | "Review needed";
    }[];
  };
};
export type Action =
  | { type: "branch"; id: string }
  | { type: "addBranch"; name: string; location: string }
  | { type: "cart"; id: number; quantity: number }
  | {
      type: "basket";
      customer?: string;
      discount?: number;
      discountKind?: "percent" | "fixed";
      promotion?: string;
      redeem?: number;
    }
  | { type: "clearCart" }
  | { type: "hold"; name: string }
  | { type: "resume"; id: number }
  | { type: "discard"; id: number }
  | { type: "checkout"; payments: Payment[]; documentId?: number }
  | {
      type: "promotion";
      name: string;
      percent: number;
      ends: string;
      productId: number | null;
    }
  | {
      type: "return";
      id: number;
      productId: number;
      quantity: number;
      restock: boolean;
      reason: string;
    }
  | { type: "document"; kind: "Quotation" | "Invoice"; due: string }
  | { type: "convertDocument" | "issueDocument" | "payDocument"; id: number }
  | { type: "openRegister"; amount: number }
  | { type: "cashEntry"; amount: number; label: string }
  | { type: "closeRegister"; amount: number }
  | { type: "startCount"; name: string }
  | { type: "count"; id: number; productId: number; quantity: number }
  | { type: "finaliseCount" | "refreshCount"; id: number; reason?: string }
  | {
      type: "batch";
      productId: number;
      quantity: number;
      expires: string;
      code: string;
    }
  | { type: "writeOff"; id: number; reason: string }
  | {
      type: "variant";
      parentId: number;
      name: string;
      size: string;
      sku: string;
      price: number;
      stock: number;
    }
  | {
      type: "bundle";
      name: string;
      price: number;
      components: { productId: number; quantity: number }[];
    }
  | { type: "barcode"; id: number; code: string }
  | { type: "transfer"; productId: number; quantity: number; to: string }
  | {
      type: "dispatchTransfer" | "receiveTransfer" | "cancelTransfer";
      id: number;
    }
  | {
      type: "shop";
      name?: string;
      description?: string;
      published?: boolean;
      branch?: string;
      hidden?: number[];
      fee?: number;
    }
  | {
      type: "placeOrder";
      customer: string;
      cart: Record<number, number>;
      address: string;
    }
  | { type: "orderStatus"; id: number; status: CustomerOrder["status"] }
  | { type: "pack"; id: number; productId: number }
  | { type: "orderPaid"; id: number }
  | { type: "rewardRate"; amount: number }
  | {
      type: "preferences";
      language?: "en" | "sw";
      theme?: "light" | "dark" | "system";
      textSize?: number;
    }
  | { type: "syncMode"; mode: Operations["sync"]["mode"] }
  | { type: "retrySync"; id: number };

export const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dateAfter = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export function minor(value: string): number {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("Enter a valid amount with up to two decimal places.");
  const [a, b = ""] = value.trim().split(".");
  return Number(a) * 100 + Number(b.padEnd(2, "0"));
}
export const cash = (value: number, language = "en") =>
  `KES ${new Intl.NumberFormat(language === "sw" ? "sw-KE" : "en-KE", { minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(value / 100)}`;
export function barcode(id: number) {
  const value = `616000${String(id).padStart(6, "0")}`;
  return (
    value +
    ((10 -
      ([...value].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) %
        10)) %
      10)
  );
}
export function validBarcode(code: string) {
  return (
    /^\d{13}$/.test(code) &&
    [...code].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0
  );
}
export function eanBars(code: string): string {
  if (!validBarcode(code)) return "";
  const left = [
    "0001101",
    "0011001",
    "0010011",
    "0111101",
    "0100011",
    "0110001",
    "0101111",
    "0111011",
    "0110111",
    "0001011",
  ];
  const even = [
    "0100111",
    "0110011",
    "0011011",
    "0100001",
    "0011101",
    "0111001",
    "0000101",
    "0010001",
    "0001001",
    "0010111",
  ];
  const parity = [
    "LLLLLL",
    "LLGLGG",
    "LLGGLG",
    "LLGGGL",
    "LGLLGG",
    "LGGLLG",
    "LGGGLL",
    "LGLGLG",
    "LGLGGL",
    "LGGLGL",
  ][+code[0]];
  return (
    "101" +
    [...code.slice(1, 7)]
      .map((c, i) => (parity[i] === "L" ? left : even)[+c])
      .join("") +
    "01010" +
    [...code.slice(7)]
      .map((c) => [...left[+c]].map((b) => (b === "0" ? "1" : "0")).join(""))
      .join("") +
    "101"
  );
}
export function initialOperations(products: Product[]): Operations {
  const main = Object.fromEntries(products.map((p) => [p.id, p.stock]));
  const second = Object.fromEntries(
    products.map((p) => [p.id, Math.floor(p.stock / 2)]),
  );
  const batches: Batch[] = [];
  for (const [branch, stock] of Object.entries({ main, westlands: second }))
    for (const p of products) {
      const qty = stock[p.id];
      if (qty)
        batches.push({
          id: batches.length + 1,
          productId: p.id,
          branch,
          code: `${branch.toUpperCase()}-${p.id}`,
          quantity: qty,
          expires: dateAfter(p.id === 7 ? 5 : 120),
        });
    }
  return {
    version: 2,
    activeBranch: "main",
    branches: [
      { id: "main", name: "Main shop", location: "Nairobi CBD" },
      { id: "westlands", name: "Westlands", location: "Westlands, Nairobi" },
    ],
    stock: { main, westlands: second },
    cart: {},
    customer: "Walk-in customer",
    discount: 0,
    discountKind: "percent",
    promotion: "",
    redeem: 0,
    held: [],
    receipts: [
      {
        id: 1043,
        branch: "main",
        customer: "Mary Wambui",
        lines: [
          {
            productId: 1,
            name: "Soko Maize Flour · 2 kg",
            quantity: 2,
            unit: 18000,
            net: 36000,
          },
        ],
        total: 36000,
        discount: 0,
        payments: [{ method: "Cash", amount: 36000 }],
        date: localDate(),
        earned: 3,
        redeemed: 0,
        returned: {},
      },
    ],
    returns: [],
    promotions: [
      {
        id: 1,
        name: "Neighbourhood thank-you",
        percent: 5,
        ends: dateAfter(30),
        productId: null,
      },
    ],
    documents: [],
    registers: [],
    counts: [],
    batches,
    transfers: [],
    movements: products.map((p) => ({
      id: p.id,
      productId: p.id,
      branch: "main",
      delta: p.stock,
      reason: "Opening stock",
      reference: "Sample catalogue",
      date: localDate(),
    })),
    deliveries: [],
    loyalty: { "Mary Wambui": 120, "John Mwangi": 45 },
    rewards: [
      {
        id: 1,
        customer: "Mary Wambui",
        points: 120,
        reason: "Opening sample points",
        date: localDate(),
      },
    ],
    rewardRate: 10000,
    shop: {
      published: true,
      name: "Wanjiku General Shop",
      description: "Your neighbourhood essentials, a little closer.",
      branch: "main",
      hidden: [],
      fee: 15000,
    },
    preferences: { language: "en", theme: "light", textSize: 100 },
    sync: { mode: "Local only", entries: [] },
  };
}
const assert: (valid: unknown, message: string) => asserts valid = (
  valid,
  message,
) => {
  if (!valid) throw new Error(message);
};
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value + "T00:00:00Z")) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
const integer = (n: number, min = 0) =>
  Number.isSafeInteger(n) && n >= min && n <= 100000000000;
const nextId = (items: { id: number }[]) =>
  Math.max(0, ...items.map((i) => i.id)) + 1;
export function available(
  state: DemoState,
  id: number,
  branch = state.operations.activeBranch,
  includeReserved = true,
): number {
  const p = state.products.find((p) => p.id === id);
  if (!p) return 0;
  if (p.components?.length)
    return Math.min(
      ...p.components.map((c) =>
        Math.floor(
          available(state, c.productId, branch, includeReserved) / c.quantity,
        ),
      ),
    );
  const raw =
    branch === state.operations.activeBranch
      ? p.stock
      : (state.operations.stock[branch]?.[id] ?? 0);
  const expired = state.operations.batches
    .filter(
      (b) =>
        b.productId === id && b.branch === branch && b.expires < localDate(),
    )
    .reduce((s, b) => s + b.quantity, 0);
  const reserved = includeReserved
    ? state.operations.deliveries
        .filter(
          (o) =>
            o.branch === branch && ["Confirmed", "Packing"].includes(o.status),
        )
        .reduce(
          (sum, o) =>
            sum +
            o.lines.reduce(
              (s, l) =>
                s +
                (l.components ?? [{ productId: l.productId, quantity: 1 }])
                  .filter((c) => c.productId === id)
                  .reduce((a, c) => a + c.quantity * l.quantity, 0),
              0,
            ),
          0,
        )
    : 0;
  return Math.max(0, raw - expired - reserved);
}
export function pricedLines(
  state: DemoState,
  cart: Record<number, number>,
  discount = 0,
  kind: "percent" | "fixed" = "percent",
  redeem = 0,
  promotion = "",
): { lines: SaleLine[]; total: number; discount: number } {
  assert(
    Object.entries(cart).every(
      ([id, n]) => state.products.some((p) => p.id === +id) && integer(n),
    ),
    "Check your product quantities.",
  );
  const lines = state.products
    .filter((p) => cart[p.id] > 0)
    .map((p) => ({
      productId: p.id,
      name: `${p.name} · ${p.size}`,
      quantity: cart[p.id],
      unit: Math.round(p.price * 100),
      net: Math.round(p.price * 100) * cart[p.id],
      components: p.components,
    }));
  const subtotal = lines.reduce((s, l) => s + l.net, 0);
  assert(
    integer(discount) && discount <= (kind === "percent" ? 100 : subtotal),
    "Discount must fit the basket total.",
  );
  assert(
    Number.isSafeInteger(subtotal) && subtotal <= 1_000_000_000,
    "Keep a demo basket below KES 10,000,000.",
  );
  function allocate(deduction: number, eligible: SaleLine[]) {
    let assigned = 0;
    const basis = eligible.reduce((sum, l) => sum + l.net, 0);
    eligible.forEach((line, i) => {
      const portion =
        i === eligible.length - 1
          ? deduction - assigned
          : Number((BigInt(deduction) * BigInt(line.net)) / BigInt(basis || 1));
      assigned += portion;
      line.net -= portion;
    });
  }
  let deducted =
    kind === "percent" ? Math.round((subtotal * discount) / 100) : discount;
  let eligible = lines;
  if (promotion) {
    const offer = state.operations.promotions.find(
      (p) => String(p.id) === promotion,
    );
    assert(
      offer && offer.ends >= localDate(),
      "This promotion has expired or is unavailable.",
    );
    eligible = lines.filter(
      (l) => offer.productId === null || offer.productId === l.productId,
    );
    deducted = Math.round(
      (eligible.reduce((sum, l) => sum + l.net, 0) * offer.percent) / 100,
    );
  }
  assert(
    integer(redeem) && redeem * 100 <= subtotal - deducted,
    "Reward points exceed the basket’s amount due.",
  );
  allocate(deducted, eligible);
  allocate(redeem * 100, lines);
  deducted += redeem * 100;
  return { lines, total: subtotal - deducted, discount: deducted };
}
export function execute(
  original: DemoState,
  action: Action,
): { state: DemoState; message: string; id?: number } {
  const state = structuredClone(original);
  const op = state.operations;
  op.stock[op.activeBranch] = Object.fromEntries(
    state.products.filter((p) => !p.components).map((p) => [p.id, p.stock]),
  );
  let message = "Saved in this demo browser.";
  let resultId: number | undefined;
  const log = (label: string) => {
    op.sync.entries.unshift({
      id: nextId(op.sync.entries),
      label,
      status:
        op.sync.mode === "Conflict preview"
          ? "Review needed"
          : op.sync.mode === "Offline preview"
            ? "Retry preview"
            : "Saved on device",
    });
    op.sync.entries = op.sync.entries.slice(0, 100);
  };
  const stock = (
    id: number,
    delta: number,
    reason: string,
    reference: string,
    branch = op.activeBranch,
    allowExpired = false,
  ) => {
    const p = state.products.find((p) => p.id === id);
    assert(p && !p.components, "Choose an individual stock item.");
    const current = op.stock[branch]?.[id] ?? 0;
    assert(
      integer(Math.abs(delta)) && current + delta >= 0,
      "Stock quantity is unavailable.",
    );
    op.stock[branch] ??= {};
    op.stock[branch][id] = current + delta;
    if (branch === op.activeBranch) p.stock = current + delta;
    if (delta > 0)
      op.batches.push({
        id: nextId(op.batches),
        productId: id,
        branch,
        code: `LOCAL-${nextId(op.batches)}`,
        quantity: delta,
        expires: dateAfter(120),
      });
    else {
      let remaining = -delta;
      const batches = op.batches
        .filter(
          (b) =>
            b.branch === branch &&
            b.productId === id &&
            (allowExpired || b.expires >= localDate()),
        )
        .sort((a, b) => a.expires.localeCompare(b.expires));
      for (const b of batches) {
        const take = Math.min(b.quantity, remaining);
        b.quantity -= take;
        remaining -= take;
      }
      assert(remaining === 0, "Batch stock changed. Review your inventory.");
    }
    op.movements.unshift({
      id: nextId(op.movements),
      productId: id,
      branch,
      delta,
      reason,
      reference,
      date: localDate(),
    });
  };
  const cashEntry = (amount: number, label: string, branch = op.activeBranch) =>
    op.registers
      .find((r) => r.branch === branch && r.status === "Open")
      ?.entries.push({ amount, label });
  const point = (customer: string, points: number, reason: string) => {
    if (customer === "Walk-in customer" || !points) return;
    op.loyalty[customer] = (op.loyalty[customer] ?? 0) + points;
    op.rewards.unshift({
      id: nextId(op.rewards),
      customer,
      points,
      reason,
      date: localDate(),
    });
  };
  const changeLines = (
    lines: SaleLine[],
    factor: number,
    reason: string,
    reference: string,
    branch = op.activeBranch,
  ) => {
    for (const line of lines)
      for (const part of line.components ?? [
        { productId: line.productId, quantity: 1 },
      ])
        stock(
          part.productId,
          line.quantity * part.quantity * factor,
          reason,
          reference,
          branch,
        );
  };
  const checkout = (payments: Payment[], documentId?: number) => {
    const doc =
      documentId === undefined
        ? undefined
        : op.documents.find((d) => d.id === documentId);
    if (documentId !== undefined)
      assert(
        doc &&
          doc.kind === "Invoice" &&
          doc.status !== "Paid locally" &&
          doc.branch === op.activeBranch,
        "This invoice is already paid or belongs to another branch.",
      );
    const basket = doc
      ? { lines: doc.lines, total: doc.total, discount: 0 }
      : pricedLines(
          state,
          op.cart,
          op.discount,
          op.discountKind,
          op.redeem,
          op.promotion,
        );
    assert(basket.lines.length, "Add a product to your basket first.");
    assert(
      basket.lines.every((l) => l.quantity <= available(state, l.productId)),
      "A product is no longer available at this branch.",
    );
    assert(
      payments.length > 0 &&
        payments.every(
          (p) =>
            ["Cash", "M-Pesa", "Card"].includes(p.method) && integer(p.amount),
        ) &&
        payments.reduce((s, p) => s + p.amount, 0) === basket.total,
      "Payment portions must equal the exact amount due.",
    );
    assert(
      doc ||
        op.redeem === 0 ||
        (!doc &&
          op.customer !== "Walk-in customer" &&
          integer(op.redeem) &&
          op.redeem <= (op.loyalty[op.customer] ?? 0)),
      "You do not have enough reward points.",
    );
    const id =
      Math.max(
        1048,
        ...state.sales.map((s) => s.id),
        ...op.receipts.map((r) => r.id),
      ) + 1;
    const customer = doc?.customer ?? op.customer;
    const earned =
      customer === "Walk-in customer"
        ? 0
        : Math.floor(basket.total / op.rewardRate);
    const redeemed = doc ? 0 : op.redeem;
    const receipt: DetailedReceipt = {
      id,
      branch: op.activeBranch,
      customer,
      lines: basket.lines,
      total: basket.total,
      discount: basket.discount,
      payments: payments.filter((p) => p.amount > 0),
      date: localDate(),
      earned,
      redeemed,
      returned: {},
    };
    changeLines(basket.lines, -1, "Sale", `Receipt #${id}`);
    op.receipts.unshift(receipt);
    state.sales.unshift({
      id,
      customer,
      items: basket.lines.reduce((s, l) => s + l.quantity, 0),
      amount: basket.total / 100,
      method: payments
        .filter((p) => p.amount > 0)
        .map((p) => p.method)
        .join(" + "),
      time: new Intl.DateTimeFormat("en-KE", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Africa/Nairobi",
      }).format(new Date()),
      branch: op.activeBranch,
    });
    payments
      .filter((p) => p.method === "Cash")
      .forEach((p) => cashEntry(p.amount, `Sale #${id}`));
    point(customer, earned - redeemed, `Receipt #${id}`);
    if (doc) {
      doc.status = "Paid locally";
      doc.saleId = id;
    }
    op.cart = {};
    op.discount = 0;
    op.promotion = "";
    op.redeem = 0;
    resultId = id;
    message = "Demo sale recorded. No payment request was sent.";
  };
  switch (action.type) {
    case "branch":
      if (Object.values(op.cart).some((n) => n > 0))
        op.held.unshift({
          id: nextId(op.held),
          branch: op.activeBranch,
          name: `${op.branches.find((b) => b.id === op.activeBranch)?.name} · saved on branch switch`,
          cart: op.cart,
          customer: op.customer,
          discount: op.discount,
          discountKind: op.discountKind,
          promotion: op.promotion,
          redeem: op.redeem,
        });
      assert(
        op.branches.some((b) => b.id === action.id),
        "Branch not found.",
      );
      op.activeBranch = action.id;
      state.products.forEach(
        (p) => (p.stock = op.stock[action.id]?.[p.id] ?? 0),
      );
      op.cart = {};
      op.discount = 0;
      op.promotion = "";
      op.redeem = 0;
      message = "Branch switched. Your branch records are now in view.";
      break;
    case "addBranch": {
      assert(action.name.trim(), "Enter a branch name.");
      const id = `branch-${op.branches.length + 1}`;
      op.branches.push({
        id,
        name: action.name.trim(),
        location: action.location.trim(),
      });
      op.stock[id] = {};
      break;
    }
    case "cart": {
      assert(
        integer(action.quantity) &&
          action.quantity <= available(state, action.id),
        "This quantity is not available at this branch.",
      );
      op.cart[action.id] = action.quantity;
      break;
    }
    case "basket":
      if (action.discount !== undefined)
        assert(integer(action.discount), "Enter a valid discount.");
      if (action.redeem !== undefined)
        assert(integer(action.redeem), "Enter whole reward points.");
      for (const key of [
        "customer",
        "discount",
        "discountKind",
        "promotion",
        "redeem",
      ] as const)
        if (action[key] !== undefined)
          Object.assign(op, { [key]: action[key] });
      pricedLines(
        state,
        op.cart,
        op.discount,
        op.discountKind,
        op.redeem,
        op.promotion,
      );
      break;
    case "clearCart":
      op.cart = {};
      op.discount = 0;
      op.redeem = 0;
      op.promotion = "";
      break;
    case "hold":
      assert(
        Object.values(op.cart).some((n) => n > 0),
        "Add a product before holding this sale.",
      );
      op.held.unshift({
        branch: op.activeBranch,
        id: nextId(op.held),
        name: action.name.trim() || "A sale for later",
        cart: op.cart,
        customer: op.customer,
        discount: op.discount,
        discountKind: op.discountKind,
        promotion: op.promotion,
        redeem: op.redeem,
      });
      op.cart = {};
      op.discount = 0;
      op.promotion = "";
      op.redeem = 0;
      message = "Basket parked. Stock has not changed.";
      break;
    case "resume": {
      assert(
        !Object.values(op.cart).some((n) => n > 0),
        "Hold or clear your current basket before resuming another.",
      );
      const held = op.held.find((b) => b.id === action.id);
      assert(held, "Basket not found.");
      assert(
        (held.branch ?? "main") === op.activeBranch,
        "Switch to the basket’s branch before resuming it.",
      );
      assert(
        Object.entries(held.cart).every(
          ([id, n]) => n <= available(state, +id),
        ),
        "Stock changed. Restock the unavailable item before resuming this basket.",
      );
      Object.assign(op, {
        cart: held.cart,
        customer: held.customer,
        discount: held.discount,
        discountKind: held.discountKind,
        promotion: held.promotion,
        redeem: held.redeem,
      });
      op.held = op.held.filter((b) => b.id !== held.id);
      message = "Your basket is ready at checkout.";
      break;
    }
    case "discard":
      op.held = op.held.filter((b) => b.id !== action.id);
      message = "Parked basket discarded.";
      break;
    case "checkout":
      checkout(action.payments, action.documentId);
      break;
    case "promotion":
      assert(
        action.name.trim() &&
          integer(action.percent, 1) &&
          action.percent <= 100 &&
          validDate(action.ends) &&
          action.ends >= localDate(),
        "Enter a name, 1–100% discount and a current end date.",
      );
      op.promotions.unshift({
        id: nextId(op.promotions),
        name: action.name.trim(),
        percent: action.percent,
        ends: action.ends,
        productId: action.productId,
      });
      break;
    case "return": {
      const receipt = op.receipts.find((r) => r.id === action.id);
      assert(
        receipt,
        "This legacy receipt has no item details. Choose a detailed demo receipt.",
      );
      assert(
        receipt.branch === op.activeBranch,
        "Switch to the receipt’s branch to process its return.",
      );
      const line = receipt.lines.find((l) => l.productId === action.productId);
      assert(
        line &&
          integer(action.quantity, 1) &&
          action.quantity <=
            line.quantity - (receipt.returned[line.productId] ?? 0) &&
          action.reason.trim(),
        "Choose an eligible quantity and enter a return reason.",
      );
      const before = receipt.returned[line.productId] ?? 0;
      const amount =
        Math.floor((line.net * (before + action.quantity)) / line.quantity) -
        Math.floor((line.net * before) / line.quantity);
      const refunded = op.returns
        .filter((r) => r.saleId === receipt.id)
        .reduce((s, r) => s + r.amount, 0);
      let allocated = 0;
      const payments = receipt.payments.map((p, i) => {
        const n =
          i === receipt.payments.length - 1
            ? amount - allocated
            : Math.floor(
                (p.amount * (refunded + amount)) / (receipt.total || 1),
              ) - Math.floor((p.amount * refunded) / (receipt.total || 1));
        allocated += n;
        return { method: p.method, amount: n };
      });
      receipt.returned[line.productId] = before + action.quantity;
      op.returns.unshift({
        id: nextId(op.returns),
        saleId: receipt.id,
        productId: line.productId,
        quantity: action.quantity,
        amount,
        restock: action.restock,
        reason: action.reason,
        date: localDate(),
        payments,
      });
      if (action.restock)
        changeLines(
          [{ ...line, quantity: action.quantity }],
          1,
          "Return",
          `Receipt #${receipt.id}`,
        );
      payments
        .filter((p) => p.method === "Cash")
        .forEach((p) => cashEntry(-p.amount, `Refund #${receipt.id}`));
      const points =
        Math.floor(
          (receipt.earned * (refunded + amount)) / (receipt.total || 1),
        ) - Math.floor((receipt.earned * refunded) / (receipt.total || 1));
      const restored =
        Math.floor(
          (receipt.redeemed * (refunded + amount)) / (receipt.total || 1),
        ) - Math.floor((receipt.redeemed * refunded) / (receipt.total || 1));
      point(receipt.customer, restored - points, `Return on #${receipt.id}`);
      message = `Demo refund recorded: ${cash(amount)}. No money was sent.`;
      break;
    }
    case "document": {
      assert(validDate(action.due), "Enter a valid due date.");
      const price = pricedLines(
        state,
        op.cart,
        op.discount,
        op.discountKind,
        op.redeem,
        op.promotion,
      );
      assert(
        price.lines.length && op.customer !== "Walk-in customer",
        "Add items and select a named customer before creating a document.",
      );
      assert(
        !op.redeem,
        "Reward redemption is available at checkout, not on draft documents.",
      );
      const id = nextId(op.documents);
      op.documents.unshift({
        id,
        kind: action.kind,
        customer: op.customer,
        branch: op.activeBranch,
        lines: price.lines,
        total: price.total,
        due: action.due,
        status: "Draft",
      });
      resultId = id;
      message = `${action.kind} saved without changing stock.`;
      break;
    }
    case "convertDocument": {
      const doc = op.documents.find((d) => d.id === action.id);
      assert(doc && doc.kind === "Quotation", "Choose a quotation.");
      assert(
        !op.documents.some((d) => d.kind === "Invoice" && d.id === -doc.id),
        "This quotation already has a linked invoice.",
      );
      op.documents.unshift({
        ...doc,
        id: -doc.id,
        kind: "Invoice",
        status: "Draft",
      });
      message = "Quotation copied to an invoice. Stock is unchanged.";
      break;
    }
    case "issueDocument": {
      const doc = op.documents.find((d) => d.id === action.id);
      assert(
        doc && doc.status === "Draft",
        "Only a draft can be issued locally.",
      );
      doc.status = "Issued locally";
      message = "Document marked issued locally. Nothing was emailed.";
      break;
    }
    case "payDocument": {
      const doc = op.documents.find((d) => d.id === action.id);
      assert(doc, "Document not found.");
      checkout([{ method: "Cash", amount: doc.total }], doc.id);
      break;
    }
    case "openRegister":
      assert(
        !op.registers.some(
          (r) => r.branch === op.activeBranch && r.status === "Open",
        ) && integer(action.amount),
        "This branch already has an open register, or the float is invalid.",
      );
      op.registers.unshift({
        id: nextId(op.registers),
        branch: op.activeBranch,
        opening: action.amount,
        status: "Open",
        entries: [],
      });
      message = "Demo register opened.";
      break;
    case "cashEntry": {
      const register = op.registers.find(
        (r) => r.branch === op.activeBranch && r.status === "Open",
      );
      assert(
        register && integer(Math.abs(action.amount), 1) && action.label.trim(),
        "Open a register and enter an amount and reason.",
      );
      assert(
        register.opening +
          register.entries.reduce((s, e) => s + e.amount, 0) +
          action.amount >=
          0,
        "Cash out cannot exceed expected cash.",
      );
      register.entries.push({ label: action.label, amount: action.amount });
      break;
    }
    case "closeRegister": {
      const register = op.registers.find(
        (r) => r.branch === op.activeBranch && r.status === "Open",
      );
      assert(
        register && integer(action.amount),
        "Open a register first and enter the counted cash.",
      );
      register.counted = action.amount;
      register.expected =
        register.opening + register.entries.reduce((s, e) => s + e.amount, 0);
      register.status = "Closed";
      message = `Register closed. Variance: ${cash(action.amount - register.expected)}.`;
      break;
    }
    case "startCount": {
      const id = nextId(op.counts);
      op.counts.unshift({
        id,
        branch: op.activeBranch,
        name: action.name.trim() || "Shelf count",
        starting: { ...op.stock[op.activeBranch] },
        counted: {},
        status: "Draft",
        reason: "",
      });
      resultId = id;
      break;
    }
    case "count": {
      const count = op.counts.find((c) => c.id === action.id);
      assert(
        count && count.status === "Draft" && integer(action.quantity),
        "Choose a draft count and a whole quantity.",
      );
      count.counted[action.productId] = action.quantity;
      break;
    }
    case "refreshCount": {
      const count = op.counts.find((c) => c.id === action.id);
      assert(count && count.status === "Draft", "Choose a draft count.");
      count.starting = { ...op.stock[count.branch] };
      message =
        "Starting stock refreshed. Review your counted quantities before finalising.";
      break;
    }
    case "finaliseCount": {
      const count = op.counts.find((c) => c.id === action.id);
      assert(
        count &&
          count.status === "Draft" &&
          count.branch === op.activeBranch &&
          Object.keys(count.counted).length &&
          action.reason?.trim(),
        "Select a draft, count at least one product and enter a reason.",
      );
      assert(
        Object.keys(count.counted).every(
          (id) =>
            (count.starting[+id] ?? 0) === (op.stock[count.branch][+id] ?? 0),
        ),
        "Stock changed during this count. Refresh the starting stock and review differences.",
      );
      for (const [id, n] of Object.entries(count.counted)) {
        const delta = n - (op.stock[count.branch][+id] ?? 0);
        if (delta)
          stock(
            +id,
            delta,
            "Stocktake",
            `Count #${count.id}`,
            count.branch,
            true,
          );
      }
      count.status = "Finalised";
      count.reason = action.reason!;
      message = "Count finalised. Your stock ledger is updated.";
      break;
    }
    case "batch":
      assert(
        integer(action.quantity, 1) &&
          action.code.trim() &&
          validDate(action.expires),
        "Enter a batch code, quantity and expiry date.",
      );
      stock(action.productId, action.quantity, "Batch receipt", action.code);
      Object.assign(op.batches.at(-1)!, {
        code: action.code,
        expires: action.expires,
      });
      break;
    case "writeOff": {
      const b = op.batches.find((b) => b.id === action.id);
      assert(
        b &&
          b.branch === op.activeBranch &&
          b.quantity > 0 &&
          action.reason.trim(),
        "Choose a batch with stock and enter a reason.",
      );
      const qty = b.quantity;
      b.quantity = 0;
      op.stock[b.branch][b.productId] -= qty;
      state.products.find((p) => p.id === b.productId)!.stock -= qty;
      op.movements.unshift({
        id: nextId(op.movements),
        productId: b.productId,
        branch: b.branch,
        delta: -qty,
        reason: `Write-off: ${action.reason}`,
        reference: b.code,
        date: localDate(),
      });
      message = "Batch written off locally.";
      break;
    }
    case "variant": {
      const parent = state.products.find((p) => p.id === action.parentId);
      assert(
        parent &&
          !parent.components &&
          action.name.trim() &&
          action.sku.trim() &&
          integer(action.price, 1) &&
          integer(action.stock),
        "Complete the variant details.",
      );
      assert(
        !state.products.some(
          (p) => p.sku.toLowerCase() === action.sku.toLowerCase(),
        ),
        "SKU already exists.",
      );
      const id = Math.max(...state.products.map((p) => p.id)) + 1;
      state.products.push({
        ...parent,
        id,
        name: action.name.trim(),
        size: action.size.trim(),
        sku: action.sku.trim(),
        price: action.price / 100,
        stock: 0,
        variantOf: parent.variantOf ?? parent.id,
        barcode: barcode(id),
      });
      op.stock[op.activeBranch][id] = 0;
      if (action.stock) stock(id, action.stock, "Opening variant", action.sku);
      break;
    }
    case "bundle": {
      assert(
        action.name.trim() &&
          integer(action.price, 1) &&
          action.components.length >= 2 &&
          new Set(action.components.map((c) => c.productId)).size ===
            action.components.length &&
          action.components.every(
            (c) =>
              integer(c.quantity, 1) &&
              state.products.some((p) => p.id === c.productId && !p.components),
          ),
        "Choose at least two different individual products and valid quantities.",
      );
      const id = Math.max(...state.products.map((p) => p.id)) + 1;
      state.products.push({
        id,
        name: action.name,
        size: "Bundle",
        sku: `BUNDLE-${id}`,
        category: "Bundles",
        price: action.price / 100,
        cost: 0,
        stock: 0,
        reorder: 0,
        art: 0,
        barcode: barcode(id),
        components: action.components,
      });
      break;
    }
    case "barcode":
      assert(
        validBarcode(action.code) &&
          !state.products.some(
            (p) =>
              p.id !== action.id &&
              (p.barcode ?? barcode(p.id)) === action.code,
          ),
        "Enter a unique EAN-13 code with a valid check digit.",
      );
      assert(
        state.products.some((p) => p.id === action.id),
        "Product not found.",
      );
      state.products.find((p) => p.id === action.id)!.barcode = action.code;
      break;
    case "transfer":
      assert(
        action.to !== op.activeBranch &&
          op.branches.some((b) => b.id === action.to) &&
          integer(action.quantity, 1) &&
          action.quantity <= available(state, action.productId) &&
          !state.products.find((p) => p.id === action.productId)?.components,
        "Choose a destination and an available individual product quantity.",
      );
      resultId = nextId(op.transfers);
      op.transfers.unshift({
        id: resultId,
        productId: action.productId,
        quantity: action.quantity,
        from: op.activeBranch,
        to: action.to,
        status: "Draft",
      });
      break;
    case "dispatchTransfer": {
      const t = op.transfers.find((t) => t.id === action.id);
      assert(
        t &&
          t.status === "Draft" &&
          t.quantity <= available(state, t.productId, t.from),
        "Only an available draft can be dispatched.",
      );
      stock(
        t.productId,
        -t.quantity,
        "Transfer out",
        `Transfer #${t.id}`,
        t.from,
      );
      t.status = "Dispatched";
      break;
    }
    case "receiveTransfer": {
      const t = op.transfers.find((t) => t.id === action.id);
      assert(
        t && t.status === "Dispatched",
        "Only an in-transit transfer can be received.",
      );
      stock(t.productId, t.quantity, "Transfer in", `Transfer #${t.id}`, t.to);
      t.status = "Received";
      break;
    }
    case "cancelTransfer": {
      const t = op.transfers.find((t) => t.id === action.id);
      assert(
        t && ["Draft", "Dispatched"].includes(t.status),
        "This transfer is already complete.",
      );
      if (t.status === "Dispatched")
        stock(
          t.productId,
          t.quantity,
          "Transfer returned",
          `Transfer #${t.id}`,
          t.from,
        );
      t.status = "Cancelled";
      break;
    }
    case "shop":
      if (action.fee !== undefined)
        assert(integer(action.fee), "Delivery fee is invalid.");
      for (const key of [
        "name",
        "description",
        "published",
        "branch",
        "hidden",
        "fee",
      ] as const)
        if (action[key] !== undefined)
          Object.assign(op.shop, { [key]: action[key] });
      break;
    case "placeOrder": {
      assert(
        op.shop.published && action.customer.trim() && action.address.trim(),
        "Enter your name and delivery or pickup details.",
      );
      const basket = pricedLines(state, action.cart);
      assert(
        basket.lines.length &&
          basket.lines.every(
            (l) =>
              !op.shop.hidden.includes(l.productId) &&
              l.quantity <= available(state, l.productId, op.shop.branch),
          ),
        "Review your basket: a product is hidden or unavailable.",
      );
      const id = nextId(op.deliveries);
      op.deliveries.unshift({
        id,
        customer: action.customer.trim(),
        branch: op.shop.branch,
        lines: basket.lines,
        fee: op.shop.fee,
        total: basket.total + op.shop.fee,
        address: action.address,
        status: "New",
        paid: false,
        packed: [],
        events: [`${localDate()} · Demo order created`],
      });
      resultId = id;
      message =
        "Demo order saved locally. No payment or delivery request was sent.";
      break;
    }
    case "orderStatus": {
      const order = op.deliveries.find((o) => o.id === action.id);
      assert(order, "Customer order not found.");
      const next: Record<string, string> = {
        New: "Confirmed",
        Confirmed: "Packing",
        Packing: "Dispatched",
        Dispatched: "Delivered",
      };
      assert(
        action.status === "Cancelled"
          ? ["New", "Confirmed", "Packing"].includes(order.status)
          : next[order.status] === action.status,
        "This order cannot move to that status.",
      );
      if (action.status === "Confirmed")
        assert(
          order.lines.every(
            (l) => l.quantity <= available(state, l.productId, order.branch),
          ),
          "Stock changed. Restock before confirming this order.",
        );
      if (action.status === "Dispatched") {
        assert(
          order.lines.every((l) => order.packed.includes(l.productId)),
          "Check every item on the packing list before dispatching.",
        );
        changeLines(
          order.lines,
          -1,
          "Customer order dispatched",
          `Order #${order.id}`,
          order.branch,
        );
      }
      order.status = action.status;
      order.events.push(`${localDate()} · ${action.status}`);
      break;
    }
    case "pack": {
      const order = op.deliveries.find((o) => o.id === action.id);
      assert(
        order &&
          order.status === "Packing" &&
          order.lines.some((l) => l.productId === action.productId),
        "Open a packing order first.",
      );
      order.packed = order.packed.includes(action.productId)
        ? order.packed.filter((id) => id !== action.productId)
        : [...order.packed, action.productId];
      break;
    }
    case "orderPaid": {
      const order = op.deliveries.find((o) => o.id === action.id);
      assert(
        order && !order.paid && order.status === "Delivered",
        "Deliver this order before recording its payment. Each order can be paid once.",
      );
      const id =
        Math.max(
          1048,
          ...state.sales.map((s) => s.id),
          ...op.receipts.map((r) => r.id),
        ) + 1;
      const earned = Math.floor(order.total / op.rewardRate);
      op.receipts.unshift({
        id,
        branch: order.branch,
        customer: order.customer,
        lines: order.lines,
        total: order.total,
        deliveryFee: order.fee,
        discount: 0,
        payments: [{ method: "Cash", amount: order.total }],
        date: localDate(),
        earned,
        redeemed: 0,
        returned: {},
      });
      state.sales.unshift({
        id,
        branch: order.branch,
        customer: order.customer,
        items: order.lines.reduce((sum, l) => sum + l.quantity, 0),
        amount: order.total / 100,
        method: "Cash",
        time: "Customer delivery",
      });
      point(order.customer, earned, `Receipt #${id}`);
      order.paid = true;
      order.events.push(
        `${localDate()} · Payment recorded locally · Receipt #${id}`,
      );
      cashEntry(order.total, `Customer order #${order.id}`, order.branch);
      message = "Demo payment recorded. No money was collected.";
      resultId = id;
      break;
    }
    case "rewardRate":
      assert(
        integer(action.amount, 100),
        "Set a spending threshold of at least KES 1 per point.",
      );
      op.rewardRate = action.amount;
      break;
    case "preferences":
      if (action.language) op.preferences.language = action.language;
      if (action.theme) op.preferences.theme = action.theme;
      if (action.textSize !== undefined) {
        assert(
          [100, 115, 130].includes(action.textSize),
          "Choose a supported text size.",
        );
        op.preferences.textSize = action.textSize;
      }
      break;
    case "syncMode":
      op.sync.mode = action.mode;
      message =
        "Connection scenario selected. There is no server sync in this preview.";
      break;
    case "retrySync": {
      const entry = op.sync.entries.find((e) => e.id === action.id);
      assert(entry, "Activity not found.");
      entry.status = "Saved on device";
      message =
        "Retry preview complete. Data remains on this device; nothing was uploaded.";
      break;
    }
  }
  if (
    !["preferences", "cart", "basket", "pack", "count", "retrySync"].includes(
      action.type,
    )
  )
    log(
      message === "Saved in this demo browser."
        ? action.type.replace(/([A-Z])/g, " $1")
        : message,
    );
  return { state, message, id: resultId };
}

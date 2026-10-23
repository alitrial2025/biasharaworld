import { initialOperations, type Operations } from "./operations";
export type Product = {
  id: number;
  name: string;
  size: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorder: number;
  art: number;
  barcode?: string;
  imagePath?: string | null;
  variantOf?: number;
  components?: { productId: number; quantity: number }[];
};
export type Sale = {
  id: number;
  customer: string;
  items: number;
  amount: number;
  method: string;
  time: string;
  branch?: string;
};
export type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  balance: number;
  purchases: number;
  color: string;
};
export type Expense = {
  id: number;
  name: string;
  category: string;
  amount: number;
  date: string;
  method: string;
};
export type Member = {
  userId?: string;
  id: number;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Invited";
};
export type Order = {
  branch?: string;
  id: number;
  supplier: string;
  items: { productId: number; quantity: number; cost: number }[];
  amount: number;
  status: "Draft" | "Received";
  date: string;
  deliveryFee?: number;
};
export type Profile = {
  name: string;
  business: string;
  email: string;
  phone: string;
  location: string;
  type: string;
  plan: string;
};
export type BusinessSupplier = {
  id: string;
  name: string;
  initial: string;
  category: string;
  description: string;
  distance: string;
  rating: string;
  reviews: number;
  color: string;
  delivery: string;
  minimum: number;
  deliveryFee?: number;
  quotes?: Record<number, number>;
};
export type DemoState = {
  suppliers?: BusinessSupplier[];
  version: 1 | 2;
  operations: Operations;
  profile: Profile;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  orders: Order[];
  members: Member[];
  notifications: Record<string, boolean>;
  target: number;
};

export const suppliers = [
  {
    id: "kifaru",
    name: "KIFARU Wholesale",
    initial: "K",
    category: "Groceries",
    description:
      "Everyday essentials, dependable supply. Stock your shelves with your customers’ favourites.",
    distance: "2.4 km",
    rating: "4.8",
    reviews: 320,
    color: "sand",
    delivery: "Next-day delivery",
    minimum: 1000,
  },
  {
    id: "bidco",
    name: "Bidco Distributors",
    initial: "B",
    category: "Household",
    description:
      "Cooking essentials, home care and more. A useful partner for your everyday stock.",
    distance: "3.1 km",
    rating: "4.6",
    reviews: 210,
    color: "mint",
    delivery: "1–2 working days",
    minimum: 1500,
  },
  {
    id: "twiga",
    name: "Twiga Foods",
    initial: "T",
    category: "Fresh produce",
    description:
      "Fresh possibilities for your shop. Explore produce and grocery staples in one place.",
    distance: "4.5 km",
    rating: "4.9",
    reviews: 189,
    color: "lavender",
    delivery: "Next-day delivery",
    minimum: 800,
  },
];

export function initialState(): DemoState {
  const seed: Omit<DemoState, "operations"> = {
    version: 2 as const,
    profile: {
      name: "Wanjiku Njeri",
      business: "Wanjiku General Shop",
      email: "wanjiku@example.com",
      phone: "",
      location: "Nairobi, Kenya",
      type: "Retail shop",
      plan: "Starter",
    },
    products: [
      {
        id: 1,
        name: "Soko Maize Flour",
        size: "2 kg",
        sku: "BW-001",
        category: "Food",
        price: 180,
        cost: 144,
        stock: 42,
        reorder: 10,
        art: 0,
      },
      {
        id: 2,
        name: "Blue Band",
        size: "500 g",
        sku: "BW-002",
        category: "Food",
        price: 350,
        cost: 280,
        stock: 24,
        reorder: 8,
        art: 1,
      },
      {
        id: 3,
        name: "Coca-Cola",
        size: "500 ml",
        sku: "BW-003",
        category: "Drinks",
        price: 120,
        cost: 96,
        stock: 8,
        reorder: 10,
        art: 2,
      },
      {
        id: 4,
        name: "Keringet Water",
        size: "1.5 L",
        sku: "BW-004",
        category: "Drinks",
        price: 100,
        cost: 80,
        stock: 56,
        reorder: 12,
        art: 3,
      },
      {
        id: 5,
        name: "Sunlight Soap",
        size: "250 g",
        sku: "BW-005",
        category: "Household",
        price: 120,
        cost: 95,
        stock: 0,
        reorder: 10,
        art: 4,
      },
      {
        id: 6,
        name: "Royco Mchuzi Mix",
        size: "50 g",
        sku: "BW-006",
        category: "Food",
        price: 80,
        cost: 60,
        stock: 36,
        reorder: 10,
        art: 5,
      },
      {
        id: 7,
        name: "Brookside Milk",
        size: "500 ml",
        sku: "BW-007",
        category: "Drinks",
        price: 65,
        cost: 50,
        stock: 6,
        reorder: 10,
        art: 6,
      },
      {
        id: 8,
        name: "Pamba Rice",
        size: "1 kg",
        sku: "BW-008",
        category: "Food",
        price: 210,
        cost: 165,
        stock: 18,
        reorder: 8,
        art: 7,
      },
    ],
    sales: [
      {
        id: 1048,
        customer: "Mary Wambui",
        items: 4,
        amount: 1250,
        method: "M-Pesa",
        time: "10:42 AM",
      },
      {
        id: 1047,
        customer: "Walk-in customer",
        items: 3,
        amount: 680,
        method: "Cash",
        time: "10:28 AM",
      },
      {
        id: 1046,
        customer: "Peter Njoroge",
        items: 7,
        amount: 2340,
        method: "M-Pesa",
        time: "10:15 AM",
      },
      {
        id: 1045,
        customer: "Ann Karanja",
        items: 2,
        amount: 530,
        method: "Card",
        time: "9:58 AM",
      },
      {
        id: 1044,
        customer: "John Mwangi",
        items: 5,
        amount: 870,
        method: "Cash",
        time: "9:41 AM",
      },
    ],
    customers: [
      {
        id: 1,
        name: "John Mwangi",
        phone: "",
        email: "",
        balance: 1200,
        purchases: 12,
        color: "mint",
      },
      {
        id: 2,
        name: "Ann Karanja",
        phone: "",
        email: "",
        balance: 850,
        purchases: 8,
        color: "sand",
      },
      {
        id: 3,
        name: "Peter Njoroge",
        phone: "",
        email: "",
        balance: 2300,
        purchases: 23,
        color: "lavender",
      },
      {
        id: 4,
        name: "Susan Wambui",
        phone: "",
        email: "",
        balance: 450,
        purchases: 6,
        color: "rose",
      },
      {
        id: 5,
        name: "David Kimani",
        phone: "",
        email: "",
        balance: 800,
        purchases: 15,
        color: "blue",
      },
      {
        id: 6,
        name: "Mary Wambui",
        phone: "",
        email: "",
        balance: 0,
        purchases: 19,
        color: "mint",
      },
    ],
    expenses: [
      {
        id: 1,
        name: "Stock transport",
        category: "Transport",
        amount: 800,
        date: "2026-10-23",
        method: "M-Pesa",
      },
      {
        id: 2,
        name: "Electricity",
        category: "Utilities",
        amount: 650,
        date: "2026-10-22",
        method: "M-Pesa",
      },
      {
        id: 3,
        name: "Packaging bags",
        category: "Supplies",
        amount: 350,
        date: "2026-10-22",
        method: "Cash",
      },
      {
        id: 4,
        name: "Shop cleaning",
        category: "Other",
        amount: 500,
        date: "2026-10-21",
        method: "Cash",
      },
    ],
    orders: [
      {
        id: 2001,
        supplier: "KIFARU Wholesale",
        items: [
          { productId: 1, quantity: 20, cost: 144 },
          { productId: 5, quantity: 12, cost: 95 },
        ],
        amount: 4320,
        status: "Draft",
        date: "2026-10-23",
      },
    ],
    members: [
      {
        id: 1,
        name: "Wanjiku Njeri",
        email: "wanjiku@example.com",
        role: "Owner",
        status: "Active",
      },
      {
        id: 2,
        name: "Grace Akinyi",
        email: "grace@example.com",
        role: "Manager",
        status: "Active",
      },
      {
        id: 3,
        name: "James Otieno",
        email: "james@example.com",
        role: "Cashier",
        status: "Invited",
      },
    ],
    notifications: {
      lowStock: true,
      salesSummary: true,
      payments: true,
      weeklyReport: false,
    },
    target: 20000,
  };
  return { ...seed, operations: initialOperations(seed.products) };
}

export const money = (amount: number) =>
  new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(amount);
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const salesTotal = (state: DemoState) =>
  state.operations.receipts
    .filter(
      (r) => r.branch === state.operations.activeBranch && r.date === today(),
    )
    .reduce((sum, r) => sum + r.total / 100, 0) -
  state.operations.returns
    .filter(
      (r) =>
        r.date === today() &&
        state.operations.receipts.some(
          (s) =>
            s.id === r.saleId && s.branch === state.operations.activeBranch,
        ),
    )
    .reduce((sum, r) => sum + r.amount / 100, 0);
export const lowStock = (state: DemoState) =>
  state.products.filter((p) => p.stock <= p.reorder);

export const articles = [
  {
    slug: "know-your-numbers",
    category: "Business basics",
    title: "Five numbers every shop owner should know",
    excerpt:
      "You don’t need a spreadsheet full of formulas. Start with the numbers that tell you how your shop is doing.",
    read: "5 min read",
    color: "mint",
    sections: [
      [
        "1. Sales: what came in",
        "Your sales total tells you how much you sold, before costs. Check it daily and compare similar days. A quiet Monday is easier to understand beside another Monday than a busy Saturday.",
      ],
      [
        "2. Gross profit: what your stock earned",
        "Subtract the cost of the goods you sold from your sales. A popular product can bring in lots of money but leave little profit. Know the difference before you discount it.",
      ],
      [
        "3. Expenses: what kept the shop running",
        "Transport, rent, electricity and packaging all count. Record the small expenses as well as the big ones. The little amounts add up.",
      ],
      [
        "4. Stock value: what is on the shelves",
        "Stock is money waiting to become a sale. Review items that move slowly and protect the products your customers buy every day.",
      ],
      [
        "5. Customer balances: what is still owed",
        "A sale on credit is not cash in your pocket. Keep a clear list of balances, agree on payment dates and make reminders part of your weekly routine.",
      ],
    ],
  },
  {
    slug: "restock-with-confidence",
    category: "Inventory",
    title: "Restock with confidence, not guesswork",
    excerpt:
      "A simple routine for knowing what to buy, when to buy it, and what can wait.",
    read: "4 min read",
    color: "sand",
    sections: [
      [
        "Start with your regulars",
        "List the products customers ask for most often. These are the shelves to check first. Running out of an everyday essential can mean losing more than one sale.",
      ],
      [
        "Set a sensible reorder point",
        "Think about how many units you sell while waiting for a delivery. Add a small buffer, then use that number as your reminder to restock. Review it when demand changes.",
      ],
      [
        "Give slow stock a second look",
        "A full shelf can look reassuring while holding up money you need elsewhere. Notice products that have stopped moving and adjust the next order.",
      ],
      [
        "Make a weekly rhythm",
        "Choose a quiet time each week to review low stock, compare supplier prices and prepare an order. A repeatable routine beats a last-minute rush.",
      ],
    ],
  },
  {
    slug: "manage-customer-credit",
    category: "Customers",
    title: "Keep customer credit clear and friendly",
    excerpt:
      "Good records protect both your cash flow and the relationships you have built.",
    read: "4 min read",
    color: "lavender",
    sections: [
      [
        "Agree before the sale",
        "Be clear about the amount, the payment date and the person responsible. A simple agreement is easier to remember than a hurried conversation.",
      ],
      [
        "Record every change",
        "Write down credit sales and repayments as they happen. Keep a running balance so you and your customer can see the same picture.",
      ],
      [
        "Make reminders a routine",
        "A friendly reminder before the agreed date is easier than a difficult conversation weeks later. Use the same weekly review to check all outstanding balances.",
      ],
      [
        "Protect your working cash",
        "Set a credit limit that fits your business. Being helpful should not prevent you from paying suppliers or keeping the shelves stocked.",
      ],
    ],
  },
];

export const faqs = [
  [
    "What is BiasharaOS?",
    "BiasharaOS brings sales, stock, expenses, customers, suppliers and business insights into one workspace, on Android and the web.",
  ],
  [
    "Can I use it without downloading an app?",
    "Yes. Sign in to the web workspace on a laptop, tablet or phone. No installation is required.",
  ],
  [
    "Is this connected to real M-Pesa payments?",
    "Payment collection is not connected yet. Record payments after you receive them. A saved M-Pesa, cash or card entry does not move money or verify it with a payment provider.",
  ],
  [
    "Will my business records be saved?",
    "Confirmed changes are saved to your business account. Sign in to the same business to access them across your devices. If a save is unconfirmed, use its retry action before submitting the change again.",
  ],
  [
    "Are the prices on the pricing page final?",
    "The plans are proposed launch pricing. Billing is not connected, and choosing a plan will not charge you.",
  ],
  [
    "Can I place a real supplier order?",
    "You can keep supplier contacts, record quotes, prepare purchase orders and record goods received. Orders are not automatically sent to suppliers; arrange ordering and payment directly.",
  ],
  [
    "Does BiasharaOS work offline?",
    "A connection is required to load business records and confirm changes. An unconfirmed save can be retried safely when you reconnect. Full offline business access is not available yet.",
  ],
  [
    "Is BiasharaAI a live AI service?",
    "The assistant provides summaries from your recorded business activity. An external AI service is not connected yet.",
  ],
];

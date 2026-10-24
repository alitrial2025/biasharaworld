"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type {
  Customer,
  Expense,
  Member,
  Order,
  Product,
  Profile,
} from "./data";
import type { Action } from "./operations";
import { emptyBusiness } from "./backend/empty";
import { supabase } from "./supabase";
import type { BusinessAccess } from "./verification";
export type LiveWorkspace = {
  businessId: string;
  slug: string;
  role: string;
  revision: number;
  updatedAt: string;
  state: ReturnType<typeof emptyBusiness>;
  access?: BusinessAccess;
};
class BusinessStore {
  storageWarning = "";
  error = "";
  busy = false;
  ready = false;
  authenticated = false;
  workspace: LiveWorkspace | null = null;
  confirmedRequestId = "";
  private state = emptyBusiness();
  private serverState = this.state;
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private userId = "";
  private generation = 0;
  private pending: {
    businessId: string;
    requestId: string;
    command: unknown;
    revision: number;
  } | null = null;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  getServerSnapshot = () => this.serverState;
  private emit = () => {
    this.state = { ...this.state };
    this.listeners.forEach((fn) => fn());
  };
  private accept = (workspace: LiveWorkspace | null) => {
    this.workspace = workspace;
    this.state = workspace?.state ?? emptyBusiness();
    if (workspace && !this.pending) {
      try {
        const raw = sessionStorage.getItem(this.pendingKey());
        if (raw) {
          this.pending = JSON.parse(raw);
          this.error =
            "A previous save is unconfirmed. Retry the saved request to check its result safely.";
        }
      } catch {
        this.error =
          "Could not restore an unconfirmed request. Review recent records before submitting again.";
      }
    }
    this.ready = true;
    this.emit();
  };
  private pendingKey = () =>
    `biashara.pending.${this.userId}.${this.workspace?.businessId || ""}`;
  private savePending = () => {
    if (this.pending)
      sessionStorage.setItem(this.pendingKey(), JSON.stringify(this.pending));
    else sessionStorage.removeItem(this.pendingKey());
  };
  setupError = (message: string) => {
    this.session("");
    this.error = message;
    this.emit();
  };
  session = (id: string) => {
    if (id === this.userId && this.ready) return;
    this.generation++;
    this.userId = id;
    this.authenticated = !!id;
    this.workspace = null;
    this.busy = false;
    this.pending = null;
    this.confirmedRequestId = "";
    this.error = "";
    this.state = emptyBusiness();
    this.ready = !id;
    this.emit();
    if (id) void this.hydrate();
  };
  private async request(body?: unknown) {
    const {
      data: { session },
    } = await supabase().auth.getSession();
    if (!session) throw new Error("Sign in to continue.");
    const response = await fetch("/api/workspace", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok) {
      const e = new Error(result.error || "Could not confirm this request.");
      Object.assign(e, { status: response.status });
      throw e;
    }
    return result;
  }
  hydrate = async () => {
    const generation = this.generation;
    try {
      const data = await this.request();
      if (generation === this.generation) {
        this.error = "";
        this.accept(data.workspace);
      }
    } catch (e) {
      if (generation === this.generation) {
        this.error = e instanceof Error ? e.message : "Connection failed.";
        this.ready = true;
        this.emit();
      }
    }
  };
  createBusiness = async (profile: {
    name: string;
    business: string;
    location: string;
    type: string;
  }) => {
    this.busy = true;
    this.error = "";
    this.emit();
    const generation = this.generation;
    try {
      const data = await this.request({ type: "createBusiness", profile });
      if (generation === this.generation) this.accept(data.workspace);
    } catch (e) {
      this.error =
        e instanceof Error ? e.message : "Could not create business.";
      throw e;
    } finally {
      this.busy = false;
      this.emit();
    }
  };
  private run = (
    command: unknown,
  ): Promise<{ message: string; id?: number }> => {
    if (this.busy || this.pending)
      return Promise.reject(
        new Error(
          this.pending
            ? "A previous request is unconfirmed. Use Retry saved request before making another change."
            : "Wait for the current save to finish.",
        ),
      );
    const generation = this.generation;
    this.busy = true;
    this.emit();
    const task = async () => {
      if (generation !== this.generation)
        throw new Error("Account changed. Please retry.");
      if (!this.workspace) throw new Error("Create your business first.");
      if (this.pending)
        throw new Error(
          "A previous request is unconfirmed. Use Retry saved request before making another change.",
        );
      this.pending = {
        businessId: this.workspace.businessId,
        command,
        revision: this.workspace.revision,
        requestId: crypto.randomUUID(),
      };
      try {
        this.savePending();
      } catch {
        this.pending = null;
        throw new Error(
          "Cannot safely retain this request in browser storage. Enable session storage before saving.",
        );
      }
      return this.sendPending();
    };
    const result = this.queue.then(task).finally(() => {
      if (generation === this.generation) {
        this.busy = false;
        this.emit();
      }
    });
    this.queue = result.catch(() => {});
    return result;
  };
  private sendPending = async () => {
    if (!this.pending) throw new Error("No request to retry.");
    const generation = this.generation;
    this.busy = true;
    this.error = "";
    this.emit();
    try {
      const requestId = this.pending.requestId;
      const data = await this.request(this.pending);
      if (generation !== this.generation) throw new Error("Account changed.");
      this.pending = null;
      this.confirmedRequestId = requestId;
      this.savePending();
      this.accept(data.workspace);
      return data.result as { message: string; id?: number };
    } catch (e) {
      if (generation === this.generation) {
        this.error = e instanceof Error ? e.message : "Request unconfirmed.";
        const status = (e as { status?: number }).status;
        if (status && status < 500) {
          this.pending = null;
          this.savePending();
          if (status === 409) await this.hydrate();
        }
        this.emit();
      }
      throw e;
    } finally {
      if (generation === this.generation) {
        this.busy = false;
        this.emit();
      }
    }
  };
  retry = () =>
    this.busy
      ? Promise.reject(new Error("Wait for the current save to finish."))
      : this.sendPending();
  get hasPending() {
    return !!this.pending;
  }
  command = (action: Action) => this.run(action);
  saveRecord = (command: unknown) => this.run(command);
  updateProfile = (profile: Partial<Profile>) =>
    this.run({ type: "updateProfile", profile });
  setTarget = (target: number) => this.run({ type: "setTarget", target });
  addProduct = (product: Omit<Product, "id">) =>
    this.run({ type: "addProduct", product });
  updateProduct = (id: number, changes: Partial<Product>) =>
    this.run({ type: "updateProduct", id, changes });
  addCustomer = (customer: Omit<Customer, "id">) =>
    this.run({ type: "addCustomer", customer });
  payBalance = (id: number, amount: number) =>
    this.run({ type: "payBalance", id, amount });
  addExpense = (expense: Omit<Expense, "id">) =>
    this.run({ type: "addExpense", expense });
  removeExpense = (id: number) => this.run({ type: "removeExpense", id });
  inviteMember = (member: Omit<Member, "id" | "status">) =>
    this.run({ type: "inviteMember", member });
  updateMember = (id: number, role: string) =>
    this.run({ type: "updateMember", id, role });
  removeMember = (id: number) => this.run({ type: "removeMember", id });
  toggleNotification = (name: string) =>
    this.run({ type: "toggleNotification", name });
  createOrder = async (
    supplier: string,
    items: Order["items"],
    deliveryFee = 0,
  ) => {
    const result = await this.run({
      type: "createOrder",
      supplier,
      items,
      deliveryFee,
    });
    return this.state.orders.find((o) => o.id === result.id)!;
  };
  receiveOrder = (id: number) => this.run({ type: "receiveOrder", id });
  checkout = async (
    quantities: Record<number, number>,
    method: string,
    customer: string,
  ) => {
    await this.command({ type: "clearCart" });
    for (const [id, quantity] of Object.entries(quantities))
      await this.command({ type: "cart", id: +id, quantity });
    await this.command({
      type: "basket",
      customer: customer || "Walk-in customer",
      discount: 0,
      redeem: 0,
      promotion: "",
    });
    const result = await this.command({
      type: "checkout",
      payments: [
        {
          method,
          amount: this.state.products.reduce(
            (s, p) => s + Math.round(p.price * 100) * (quantities[p.id] || 0),
            0,
          ),
        },
      ],
    });
    return this.state.sales.find((s) => s.id === result.id) ?? null;
  };
  reset = () => {
    throw new Error("Real business records cannot be reset to sample data.");
  };
  signOut = async () => {
    if (this.busy || this.pending)
      throw new Error(
        "Finish or retry the pending request before signing out.",
      );
    await supabase().auth.signOut();
    this.session("");
  };
}
const StoreContext = createContext<BusinessStore | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new BusinessStore());
  useEffect(() => {
    let active = true;
    try {
      const client = supabase();
      client.auth.getSession().then(({ data: { session } }) => {
        if (active) store.session(session?.user.id || "");
      });
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        queueMicrotask(() => {
          if (active) store.session(session?.user.id || "");
        });
      });
      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } catch (e) {
      store.setupError(
        e instanceof Error ? e.message : "Account service unavailable.",
      );
    }
  }, [store]);
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
export function useDemo() {
  const result = useOptionalDemo();
  if (!result) throw new Error("Business provider required.");
  return result;
}
const noSubscribe = () => () => {};
const noSnapshot = () => null;
export function useOptionalDemo() {
  const store = useContext(StoreContext);
  const state = useSyncExternalStore(
    store?.subscribe ?? noSubscribe,
    store?.getSnapshot ?? noSnapshot,
    store?.getServerSnapshot ?? noSnapshot,
  );
  return store && state ? { state, store } : null;
}

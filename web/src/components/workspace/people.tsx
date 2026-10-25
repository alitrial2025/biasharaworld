"use client";
import { T, LocalButton, LocalSelect } from "@/components/locale";
import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  Check,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  SearchField,
  SelectField,
  StatCard,
  Tabs,
  useToast,
} from "@/components/ui";
import { money, type Customer } from "@/lib/data";
import { downloadCSV } from "@/lib/csv";
import { useDemo } from "@/lib/store";

export function CustomersPage({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const { state, store } = useDemo();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("Everyone");
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const toast = useToast();
  const rows = state.customers.filter(
    (c) =>
      (c.name + " " + c.phone).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "Everyone" ||
        (filter === "With balance" ? c.balance > 0 : c.balance === 0)),
  );
  async function add(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      await store.addCustomer({
        name: String(f.get("name")).trim(),
        phone: String(f.get("phone")),
        email: String(f.get("email")),
        balance: Number(f.get("balance")),
        purchases: 0,
        color: "mint",
      });
      setOpen(false);
      toast("Your customer list has a new face.");
    } catch {
      /* The shared connection banner retains the server error and retry action. */
    }
  }
  async function repay(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      if (!customer) return;
      await store.payBalance(
        customer.id,
        Number(new FormData(e.currentTarget).get("amount")),
      );
      setCustomer(null);
      toast("Repayment recorded. Balance updated.");
    } catch {
      /* The shared connection banner retains the server error and retry action. */
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PEOPLE MAKE A BUSINESS"
        title="Customers"
        description="Keep your customers close and your balances easy to follow."
      >
        <Button
          variant="secondary"
          icon={ArrowDownToLine}
          onClick={() =>
            downloadCSV(
              "customers.csv",
              ["Name", "Phone", "Email", "Balance KES", "Purchases"],
              rows.map((c) => [
                c.name,
                c.phone,
                c.email,
                c.balance,
                c.purchases,
              ]),
            )
          }
        >
          <T>Export</T>
        </Button>
        <Button icon={Plus} onClick={() => setOpen(true)}>
          <T>Add customer</T>
        </Button>
      </PageHeading>
      <div className="stats-grid three-stats">
        <StatCard
          label="Your customers"
          value={String(state.customers.length)}
          icon={Users}
        />
        <StatCard
          label="Outstanding balances"
          value={`KES ${money(state.customers.reduce((s, c) => s + c.balance, 0))}`}
          tone="amber"
          icon={Wallet}
        />
        <StatCard
          label="All settled up"
          value={String(state.customers.filter((c) => !c.balance).length)}
          tone="blue"
          icon={Check}
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search customers…"
          />
          <Tabs
            items={["Everyone", "With balance", "All settled"]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T>Customer</T>
                </th>
                <th>
                  <T>Contact details</T>
                </th>
                <th>
                  <T>Purchases</T>
                </th>
                <th>
                  <T>Balance</T>
                </th>
                <th>
                  <T>Status</T>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <T>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="table-person">
                        <Avatar name={c.name} color={c.color} />
                        <strong>
                          <T>{c.name}</T>
                        </strong>
                      </span>
                    </td>
                    <td>
                      <span className="stacked-cell">
                        <T>{c.phone || "No phone added"}</T>
                        <small>
                          <T>{c.email || "No email added"}</T>
                        </small>
                      </span>
                    </td>
                    <td>
                      <T>{c.purchases}</T>
                    </td>
                    <td
                      className={`strong ${c.balance ? "text-red" : "text-green"}`}
                    >
                      <T>KES</T> <T>{money(c.balance)}</T>
                    </td>
                    <td>
                      <Badge tone={c.balance ? "amber" : "green"}>
                        <T>{c.balance ? "Balance due" : "All settled"}</T>
                      </Badge>
                    </td>
                    <td>
                      <LocalButton
                        className="text-button"
                        onClick={() => setCustomer(c)}
                      >
                        <T>View details</T>
                      </LocalButton>
                    </td>
                  </tr>
                ))}
              </T>
            </tbody>
          </table>
        </div>

        <T>
          {!rows.length && (
            <EmptyState
              icon={Users}
              title="No familiar faces here yet."
              description="Try a different search or add a customer."
            />
          )}
        </T>

        <div className="table-foot">
          <T>{rows.length}</T> <T>customers · Private customer records</T>
        </div>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="A new face in your business."
        description="Add the customer details you use to keep accurate business records."
      >
        <form onSubmit={add}>
          <Field label="Full name" name="name" required maxLength={80} />
          <div className="form-grid">
            <Field label="Phone number (optional)" name="phone" type="tel" />
            <Field label="Email (optional)" name="email" type="email" />
          </div>
          <Field
            label="Opening balance (KES)"
            name="balance"
            type="number"
            step="0.01"
            min={0}
            max={10000000}
            defaultValue={0}
            required
          />
          <div className="modal-actions">
            <Button type="submit">
              <T>Add customer</T>
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!customer}
        onClose={() => setCustomer(null)}
        title={customer?.name ?? "Customer"}
        description="A little clarity on your customer’s account."
      >
        <T>
          {customer && (
            <>
              <div className="customer-detail">
                <Avatar name={customer.name} color={customer.color} />
                <div>
                  <strong>
                    <T>{customer.name}</T>
                  </strong>
                  <span>
                    <T>{customer.phone || "No phone added"}</T>
                  </span>
                </div>
                <Badge tone={customer.balance ? "amber" : "green"}>
                  <T>{customer.balance ? "Balance due" : "All settled"}</T>
                </Badge>
              </div>
              <div className="balance-card">
                <span>
                  <T>Outstanding balance</T>
                </span>
                <strong>
                  <T>KES</T> <T>{money(customer.balance)}</T>
                </strong>
              </div>

              <T>
                {customer.balance > 0 ? (
                  <form onSubmit={repay}>
                    <Field
                      label="Record repayment (KES)"
                      name="amount"
                      type="number"
                      step="0.01"
                      min={0.01}
                      max={customer.balance}
                      defaultValue={customer.balance}
                      required
                    />
                    <p className="quiet-note">
                      <T>
                        Updates the saved balance. No money is collected or
                        reminder sent.
                      </T>
                    </p>
                    <div className="modal-actions">
                      <Button type="submit">
                        <T>Record repayment</T>
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="inline-note">
                    <T>All settled up. That’s a good place to be.</T>
                  </p>
                )}
              </T>
            </>
          )}
        </T>
      </Modal>
    </>
  );
}

export function TeamPage() {
  const { state, store } = useDemo();
  const [open, setOpen] = useState(false);
  const [remove, setRemove] = useState<number | null>(null);
  const toast = useToast();
  const canManage =
    store.workspace?.role === "Owner" && !store.busy && !store.hasPending;
  async function invite(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const email = String(f.get("email")).trim();
      if (
        state.members.some((m) => m.email.toLowerCase() === email.toLowerCase())
      ) {
        toast("That email is already on your team.", "info");
        return;
      }
      await store.inviteMember({
        name: String(f.get("name")).trim(),
        email,
        role: String(f.get("role")),
      });
      setOpen(false);
      toast(
        "Invitation saved. Ask your teammate to sign up with this email and confirm it; access is granted when they sign in.",
      );
    } catch {
      /* The shared connection banner retains the server error and retry action. */
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="GOOD PEOPLE. SHARED PROGRESS."
        title="Your team"
        description="Give everyone a clear place in your business."
      >
        <Button icon={Plus} disabled={!canManage} onClick={() => setOpen(true)}>
          <T>Invite teammate</T>
        </Button>
      </PageHeading>
      <div className="stats-grid three-stats">
        <StatCard
          label="People on your team"
          value={String(state.members.length)}
          icon={Users}
        />
        <StatCard
          label="Active members"
          value={String(
            state.members.filter((m) => m.status === "Active").length,
          )}
          tone="blue"
          icon={ShieldCheck}
        />
        <StatCard
          label="Pending invitations"
          value={String(
            state.members.filter((m) => m.status === "Invited").length,
          )}
          tone="amber"
          icon={Mail}
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              <T>The people behind your progress.</T>
            </h2>
            <p>
              <T>
                Preview roles and invitations. Access controls are not active
                yet.
              </T>
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T>Teammate</T>
                </th>
                <th>
                  <T>Email</T>
                </th>
                <th>
                  <T>Role</T>
                </th>
                <th>
                  <T>Status</T>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <T>
                {state.members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="table-person">
                        <Avatar name={m.name} />
                        <strong>
                          <T>{m.name}</T>
                        </strong>

                        <T>
                          {m.role === "Owner" && (
                            <Badge tone="gray">
                              <T>You</T>
                            </Badge>
                          )}
                        </T>
                      </span>
                    </td>
                    <td>
                      <T>{m.email}</T>
                    </td>
                    <td>
                      <T>
                        {m.role === "Owner" ? (
                          <span className="role-owner">
                            <ShieldCheck size={14} />
                            <T>Owner</T>
                          </span>
                        ) : (
                          <LocalSelect
                            className="table-select"
                            disabled={!canManage}
                            aria-label={`Role for ${m.name}`}
                            value={m.role}
                            onChange={async (e) => {
                              try {
                                await store.updateMember(m.id, e.target.value);
                                toast("Role saved.");
                              } catch {
                                /* The shared connection banner retains the server error and retry action. */
                              }
                            }}
                          >
                            <T>
                              {["Manager", "Cashier", "Viewer"].map((r) => (
                                <option key={r}>
                                  <T>{r}</T>
                                </option>
                              ))}
                            </T>
                          </LocalSelect>
                        )}
                      </T>
                    </td>
                    <td>
                      <Badge tone={m.status === "Active" ? "green" : "amber"}>
                        <T>{m.status}</T>
                      </Badge>
                    </td>
                    <td>
                      <T>
                        {m.role !== "Owner" && (
                          <LocalButton
                            className="icon-button text-red"
                            aria-label={`Remove ${m.name}`}
                            disabled={!canManage}
                            onClick={() => setRemove(m.id)}
                          >
                            <Trash2 size={16} />
                          </LocalButton>
                        )}
                      </T>
                    </td>
                  </tr>
                ))}
              </T>
            </tbody>
          </table>
        </div>
      </section>
      <div className="role-cards">
        <T>
          {[
            [
              "Owner",
              "The full picture. Business settings, billing, people and every tool.",
            ],
            [
              "Manager",
              "Day-to-day operations, reports, stock and customer records.",
            ],
            [
              "Cashier",
              "A focused checkout experience and everyday sales records.",
            ],
          ].map(([title, text]) => (
            <article className="panel" key={title}>
              <ShieldCheck size={22} />
              <h3>
                <T>{title}</T>
              </h3>
              <p>
                <T>{text}</T>
              </p>
            </article>
          ))}
        </T>
      </div>
      <p className="quiet-note">
        <T>
          Permissions are enforced by the business service. Only the owner can
          invite teammates or change their roles.
        </T>
      </p>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="There’s room for good people."
        description="Save an invitation for this email. Ask your teammate to sign up and confirm their address. Invitation email delivery is not connected."
      >
        <form onSubmit={invite}>
          <Field label="Full name" name="name" required />
          <Field label="Work email" name="email" type="email" required />
          <SelectField label="Role" name="role" defaultValue="Cashier">
            <T>
              {["Manager", "Cashier", "Viewer"].map((r) => (
                <option key={r}>
                  <T>{r}</T>
                </option>
              ))}
            </T>
          </SelectField>
          <div className="modal-actions">
            <Button type="submit">
              <T>Save invitation</T>
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={remove !== null}
        onClose={() => setRemove(null)}
        title="Remove this teammate?"
        description="You can add them back with a new invitation."
      >
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setRemove(null)}>
            <T>Keep teammate</T>
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                if (remove !== null) await store.removeMember(remove);
                setRemove(null);
                toast("Access removed.");
              } catch {
                /* The shared connection banner retains the server error and retry action. */
              }
            }}
          >
            <T>Remove teammate</T>
          </Button>
        </div>
      </Modal>
    </>
  );
}

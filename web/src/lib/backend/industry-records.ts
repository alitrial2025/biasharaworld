import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  industryActionReference,
  type Industry,
  type IndustryField,
  type IndustryModule,
  type IndustryRecord,
} from "../industries";
import { ApiError } from "./server";

const text = z.string().trim().min(1).max(240);
const request = { requestId: z.uuid(), sector: z.string().max(40) };
export const industryCommand = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      ...request,
      module: z.string(),
      name: text,
      values: z.record(z.string(), z.union([z.string(), z.number()])),
    })
    .strict(),
  z
    .object({
      action: z.literal("createSeats"),
      ...request,
      show: z.uuid(),
      section: text,
      row: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9-]{1,16}$/),
      first: z.number().int().min(1).max(9999),
      count: z.number().int().min(1).max(250),
    })
    .strict(),
  z
    .object({
      action: z.literal("transition"),
      ...request,
      id: z.uuid(),
      from: text,
      status: text,
      reference: text.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("admit"),
      ...request,
      code: z
        .string()
        .trim()
        .regex(/^[A-Fa-f0-9]{16}$/),
    })
    .strict(),
]);
type Command = z.infer<typeof industryCommand>;

function requireRule(valid: unknown, message: string): asserts valid {
  if (!valid) throw new ApiError(message, 409);
}

function valuesFor(
  module: IndustryModule,
  input: Record<string, unknown>,
  records: IndustryRecord[],
) {
  if (
    Object.keys(input).some(
      (key) => !module.fields.some((field) => field.key === key),
    )
  )
    throw new ApiError("This record contains an unsupported field.");
  return Object.fromEntries(
    module.fields.flatMap(
      ({ key, label, type, module: target, optional }: IndustryField) => {
        const value = input[key];
        if (optional && (value === undefined || value === "")) return [];
        const parsed = (
          type === "count"
            ? z.number().int().min(1).max(1e6)
            : type === "money"
              ? z.number().int().min(0).max(1e12)
              : type === "date"
                ? z.iso.date()
                : type === "datetime"
                  ? z.iso.datetime({ offset: true })
                  : type === "reference"
                    ? z.uuid()
                    : text
        ).safeParse(value);
        if (!parsed.success) throw new ApiError(`Check ${label}.`);
        if (
          type === "reference" &&
          !records.some(
            (record) => record.module === target && record.id === parsed.data,
          )
        ) {
          throw new ApiError(`Choose an existing ${label.toLowerCase()}.`);
        }
        return [
          [
            key,
            type === "datetime"
              ? new Date(String(parsed.data)).toISOString()
              : parsed.data,
          ],
        ];
      },
    ),
  );
}

function overlaps(first: IndustryRecord, second: IndustryRecord) {
  return (
    String(first.values.start) < String(second.values.end) &&
    String(second.values.start) < String(first.values.end)
  );
}

export function applyIndustryCommand(
  industry: Industry,
  previous: IndustryRecord[],
  input: Command,
  actor: string,
  role: string,
  now: Date,
) {
  const records = structuredClone(previous);
  const stamp = now.toISOString();
  const get = (record: IndustryRecord, field: string) =>
    records.find((item) => item.id === record.values[field]);
  let record: IndustryRecord;
  let note: string | undefined;

  function requireSeatingShow(showId: string | number) {
    const show = records.find(
      (item) => item.id === showId && item.module === "showtimes",
    );
    requireRule(
      show?.status === "Scheduled" &&
        String(show.values.end) > stamp &&
        get(show, "event")?.status === "Scheduled",
      "Choose a scheduled showtime for an active event before adding seats.",
    );
  }

  if (input.action === "createSeats") {
    requireRule(
      industry.id === "entertainment",
      "Numbered seating is available for events and cinemas.",
    );
    requireRule(
      input.first + input.count - 1 <= 9999,
      "Seat numbers must be between 1 and 9999.",
    );
    requireSeatingShow(input.show);
    const sectionKey = input.section.toLowerCase();
    const existing = new Set(
      records
        .filter(
          (item) =>
            item.module === "seats" &&
            item.values.show === input.show &&
            String(item.values.section).toLowerCase() === sectionKey,
        )
        .map((item) => item.name.toLowerCase()),
    );
    const seats = Array.from(
      { length: input.count },
      (_, offset): IndustryRecord => {
        const name = `${input.row.toUpperCase()}-${input.first + offset}`;
        requireRule(
          !existing.has(name.toLowerCase()),
          `Seat ${name} already exists in this section and showtime.`,
        );
        return {
          id: randomUUID(),
          module: "seats",
          name,
          values: { section: input.section, show: input.show },
          status: "Available",
          createdBy: actor,
          createdAt: stamp,
          updatedAt: stamp,
          history: [{ status: "Available", at: stamp, role }],
        };
      },
    );
    return {
      records: [...seats, ...records],
      record: seats[0]!,
      created: seats.length,
    };
  }

  if (input.action === "create") {
    if (industry.id === "finance" && role !== "Manager")
      throw new ApiError(
        "A manager submits banking cases for the owner to review.",
        403,
      );
    const definition = industry.modules.find(
      (item) => item.id === input.module,
    );
    requireRule(definition, "Choose a record type for your business.");
    const values = valuesFor(definition, input.values, records);
    const sameName = (entry: IndustryRecord) =>
      entry.name.toLowerCase() === input.name.toLowerCase();
    const duplicate = records.some(
      (entry) =>
        entry.module === definition.id &&
        sameName(entry) &&
        (definition.id === "seats"
          ? entry.values.show === values.show &&
            String(entry.values.section).toLowerCase() ===
              String(values.section).toLowerCase()
          : definition.id !== "tickets"),
    );
    requireRule(
      !duplicate,
      "A record with this name or reference already exists.",
    );
    record = {
      id: randomUUID(),
      module: definition.id,
      name: input.name,
      values,
      status: Object.keys(definition.flow)[0],
      createdBy: actor,
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (values.start && values.end)
      requireRule(
        String(values.start) < String(values.end),
        "Choose an end after the start.",
      );
    switch (definition.id) {
      case "claims": {
        const policy = get(record, "policy")!;
        requireRule(
          String(policy.values.start) <= String(values.incident) &&
            String(values.incident) <= String(policy.values.end) &&
            policy.status === "Active",
          "The incident must fall within an issued policy’s term.",
        );
        break;
      }
      case "rent":
        requireRule(
          ["Active", "Ended"].includes(get(record, "lease")?.status ?? ""),
          "Activate the lease before recording rent.",
        );
        break;
      case "showtimes":
        requireRule(
          get(record, "event")?.status === "Scheduled",
          "Schedule the event before adding showtimes.",
        );
        requireRule(
          !records.some(
            (entry) =>
              entry.module === "showtimes" &&
              entry.status !== "Cancelled" &&
              String(entry.values.room).toLowerCase() ===
                String(values.room).toLowerCase() &&
              String(get(entry, "event")?.values.venue).toLowerCase() ===
                String(get(record, "event")?.values.venue).toLowerCase() &&
              overlaps(entry, record),
          ),
          "This room already has an overlapping showtime.",
        );
        break;
      case "seats":
        requireSeatingShow(values.show);
        break;
      case "kitchen":
        requireRule(
          get(record, "table")?.status === "Available",
          "Choose a table in service.",
        );
        break;
      case "tickets": {
        const seat = get(record, "seat")!;
        const show = get(seat, "show")!;
        requireRule(
          seat.status === "Available" &&
            ["Scheduled", "Admission open"].includes(show.status) &&
            String(show.values.end) > stamp &&
            get(show, "event")?.status === "Scheduled",
          "This seat or showtime is unavailable.",
        );
        requireRule(
          !records.some(
            (entry) =>
              entry.module === "tickets" &&
              entry.values.seat === seat.id &&
              (["Issued", "Checked in"].includes(entry.status) ||
                (entry.status === "Reserved" &&
                  (entry.expiresAt ?? "") > stamp)),
          ),
          "This seat already has an active ticket.",
        );
        record.expiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();
        record.code = randomUUID()
          .replaceAll("-", "")
          .slice(0, 16)
          .toUpperCase();
        break;
      }
      case "stays":
        requireRule(
          get(record, "room")?.status === "Available",
          "Choose a room in service.",
        );
        requireRule(
          !records.some(
            (entry) =>
              entry.module === "stays" &&
              entry.values.room === values.room &&
              ["Reserved", "Checked in"].includes(entry.status) &&
              overlaps(entry, record),
          ),
          "This room is already reserved for those dates.",
        );
        break;
      case "enrolments": {
        const course = get(record, "course")!;
        const enrolled = records.filter(
          (entry) =>
            entry.module === "enrolments" &&
            entry.values.course === course.id &&
            entry.status !== "Withdrawn",
        );
        requireRule(
          course.status === "Open" &&
            enrolled.length < Number(course.values.capacity),
          "This course is closed or full.",
        );
        requireRule(
          !enrolled.some(
            (entry) =>
              String(entry.values.student).toLowerCase() ===
              String(values.student).toLowerCase(),
          ),
          "This learner already has an enrolment.",
        );
        break;
      }
    }
    records.unshift(record);
  } else if (input.action === "admit") {
    requireRule(
      industry.id === "entertainment",
      "Ticket admission is for events and cinemas.",
    );
    const ticket = records.find(
      (item) =>
        item.module === "tickets" && item.code === input.code.toUpperCase(),
    );
    requireRule(ticket, "Ticket code unavailable.");
    requireRule(
      ticket.status === "Issued",
      ticket.status === "Checked in"
        ? "This ticket has already checked in."
        : "Issue the ticket before admitting a guest.",
    );
    const show = get(get(ticket, "seat")!, "show")!;
    requireRule(
      show.status === "Admission open" &&
        String(show.values.end) > stamp &&
        get(show, "event")?.status === "Scheduled",
      "Admission is closed for this showtime.",
    );
    record = ticket;
    record.status = "Checked in";
  } else {
    const target = records.find((item) => item.id === input.id);
    requireRule(target, "This record is unavailable.");
    record = target;
    const definition = industry.modules.find(
      (item) => item.id === record.module,
    );
    requireRule(
      record.status === input.from &&
        definition?.flow[record.status]?.includes(input.status),
      "The record has changed. Refresh before continuing.",
    );
    if (
      industry.id === "finance" &&
      ["Approved", "Declined"].includes(input.status)
    ) {
      requireRule(
        role === "Owner" && actor !== record.createdBy,
        "A different team member with owner access must review this request.",
      );
    }
    const evidence = industryActionReference(
      record.module,
      input.status,
      record.values,
    );
    if (
      [
        "Decision reason",
        "Exception reason",
        "Quality check reference",
      ].includes(evidence)
    ) {
      requireRule(input.reference, `Enter the ${evidence.toLowerCase()}.`);
      note = input.reference;
    }
    if (record.module === "showtimes" && input.status === "Admission open") {
      requireRule(
        String(record.values.end) > stamp &&
          get(record, "event")?.status === "Scheduled",
        "Only an upcoming or ongoing showtime for a scheduled event can open admission.",
      );
    }
    if (record.module === "stays" && input.status === "Checked in") {
      requireRule(
        get(record, "room")?.status === "Available",
        "This room is currently out of service.",
      );
    }
    if (record.module === "leases" && input.status === "Active") {
      requireRule(
        get(record, "property")?.status === "Available" &&
          get(record, "tenant")?.status === "Current",
        "Choose an active property and tenant.",
      );
      requireRule(
        !records.some(
          (entry) =>
            entry.id !== record.id &&
            entry.module === "leases" &&
            entry.status === "Active" &&
            entry.values.property === record.values.property &&
            overlaps(entry, record),
        ),
        "There is an overlapping lease for this unit.",
      );
    }
    if (record.module === "renewals" && input.status === "Renewed") {
      const policy = get(record, "policy")!;
      requireRule(
        policy.status === "Active" &&
          String(record.values.end) > String(policy.values.end),
        "The renewal must extend an active policy.",
      );
      policy.values.end = record.values.end;
      policy.updatedAt = stamp;
    }
    if (record.module === "tickets" && input.status === "Issued") {
      requireRule(
        (record.expiresAt ?? "") > stamp,
        "The reservation expired. Reserve the seat again.",
      );
      const seat = get(record, "seat")!;
      const show = get(seat, "show")!;
      requireRule(seat.status === "Available", "This seat is blocked.");
      requireRule(
        Number(record.values.amount) === 0 || input.reference,
        "Enter the paid ticket reference before issuing the ticket.",
      );
      if (input.reference) record.values.payment = input.reference;
      requireRule(
        ["Scheduled", "Admission open"].includes(show.status) &&
          String(show.values.end) > stamp &&
          get(show, "event")?.status === "Scheduled",
        "This showtime is unavailable.",
      );
    }
    if (
      ["premiums", "rent"].includes(record.module) &&
      input.status === "Received"
    ) {
      requireRule(
        input.reference || record.values.payment,
        "Enter the reference for the payment already received.",
      );
      if (input.reference) record.values.payment = input.reference;
    }
    if (record.module === "dispatch" && input.status === "Delivered") {
      requireRule(
        input.reference || record.values.proof,
        "Enter proof of delivery.",
      );
      if (input.reference) record.values.proof = input.reference;
    }
    record.status = input.status;
  }
  // Older records still have their current status even when their earlier history was not captured.
  record.history = [
    ...(record.history ?? []),
    { status: record.status, at: stamp, role, ...(note ? { note } : {}) },
  ];
  record.updatedAt = stamp;
  return { records, record, created: undefined };
}

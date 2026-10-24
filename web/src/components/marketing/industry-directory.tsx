"use client";
import { useState } from "react";
import { industries } from "@/lib/industries";
import { Button, Field } from "@/components/ui";
import styles from "./industry-directory.module.css";

export function IndustryDirectory() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const matches = industries.filter((industry) =>
    [
      industry.label,
      ...industry.aliases,
      ...industry.workflows.map((workflow) => workflow.label),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <section
      className={`container section ${styles.directory}`}
      id="business-types"
    >
      <span className="eyebrow">A WORLD OF BUSINESS</span>
      <h2>A workspace that fits your business.</h2>
      <p>
        Choose your business type during setup. Your workspace brings its
        relevant workflows forward, with shared tools available whenever you
        need them.
      </p>
      <Field
        label="Find your business type"
        placeholder="Try events, farming, beauty or transport"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <p className="quiet-note" role="status">
        {matches.length} business types
      </p>
      <div className={styles.grid}>
        {(expanded || search.trim() ? matches : matches.slice(0, 6)).map(
          (industry) => (
            <article className={styles.card} key={industry.id}>
              <h3>{industry.label}</h3>
              <p>{industry.description}</p>
              <ul>
                {industry.workflows.map((workflow) => (
                  <li key={workflow.id}>{workflow.label}</li>
                ))}
              </ul>
            </article>
          ),
        )}
      </div>
      {!search.trim() && (
        <Button
          variant="secondary"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "Show fewer business types"
            : "Explore all 20 business types"}
        </Button>
      )}
      {!matches.length && (
        <p>
          No match yet. Try a broader word or contact us to discuss your
          business.
        </p>
      )}
      <div className="button-row">
        <Button href="/signup" arrow>
          Set up your business
        </Button>
        <Button href="/contact" variant="secondary">
          Talk to us
        </Button>
      </div>
      <p className="quiet-note">
        Launching in Kenya. More African countries are coming soon. Sector tools
        manage business records; provider services such as payments, identity
        checks and lending will be added separately.
      </p>
    </section>
  );
}

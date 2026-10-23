"use client";
import { features } from "@/components/tools/common";
import { T } from "@/components/locale";
import { Button, Badge } from "@/components/ui";
export function ExpandedTools() {
  return (
    <section className="section expanded-public-tools">
      <div className="container">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">
              <T>ROOM FOR YOUR NEXT STEP</T>
            </p>
            <h2>
              <T>Twenty more ways to move forward.</T>
            </h2>
            <p>
              <T>
                From your next sale to your next branch. Manage your products,
                customers and records in one workspace.
              </T>
            </p>
          </div>
          <Button href="/dashboard/tools" arrow>
            <T>Explore all tools</T>
          </Button>
        </div>
        <div className="expanded-public-grid">
          {["Selling", "Stock", "Growth", "Your space"].map((group) => (
            <article className="panel" key={group}>
              <Badge>{group}</Badge>
              {features
                .filter((f) => f.group === group)
                .map((f) => (
                  <a key={f.id} href={`/dashboard/${f.slug}`}>
                    <f.icon size={17} />
                    <span>
                      <T>{f.title}</T>
                    </span>
                  </a>
                ))}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

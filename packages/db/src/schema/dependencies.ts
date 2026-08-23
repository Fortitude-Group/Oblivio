import { pgTable, text, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { edgeKindEnum } from "./enums";
import { ecosystems, packages } from "./packages";

/**
 * An edge in the per-ecosystem dependency graph. Transitive dependents are
 * computed from these to build the working universe (FR-003, data-model:
 * DependencyEdge).
 */
export const dependencyEdges = pgTable(
  "dependency_edges",
  {
    ecosystemId: text("ecosystem_id")
      .notNull()
      .references(() => ecosystems.id),
    fromPackageId: uuid("from_package_id")
      .notNull()
      .references(() => packages.id),
    toPackageId: uuid("to_package_id")
      .notNull()
      .references(() => packages.id),
    edgeKind: edgeKindEnum("edge_kind").notNull(),
  },
  (t) => [
    uniqueIndex("dependency_edges_unique").on(
      t.fromPackageId,
      t.toPackageId,
      t.edgeKind,
    ),
    index("dependency_edges_to").on(t.toPackageId),
  ],
);

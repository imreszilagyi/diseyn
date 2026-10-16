# Graph Report - diseyn  (2026-06-04)

## Corpus Check
- 48 files · ~14,875 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 257 nodes · 353 edges · 26 communities (22 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b2ffccb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `scripts` - 14 edges
2. `requireDb()` - 10 edges
3. `compilerOptions` - 10 edges
4. `$lib/components/dashboard/ManufacturerProfileSettings.svelte` - 8 edges
5. `Diseyn` - 8 edges
6. `emulators` - 6 edges
7. `$lib/components/dashboard/ContractorCatalogSection.svelte` - 6 edges
8. `$lib/components/dashboard/DesignerConceptsSection.svelte` - 6 edges
9. `main()` - 5 edges
10. `$lib/components/dashboard/ManufacturerDashboardNav.svelte` - 5 edges

## Surprising Connections (you probably didn't know these)
- `switchActiveRole()` --calls--> `GET()`  [INFERRED]
  src/lib/stores/auth.ts → src/routes/api/geocode/+server.ts

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (22): $lib/components/dashboard/ContractorCatalogSection.svelte, $lib/components/dashboard/DesignerConceptsSection.svelte, $lib/components/dashboard/ManufacturerDashboardNav.svelte, isCatalog, isSettings, $lib/components/dashboard/ManufacturerProfileSettings.svelte, loading, $app/navigation (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (20): firebase/auth, $app/environment, authEmulatorPort, firebaseConfig, firestoreEmulatorPort, storageEmulatorPort, GET(), NominatimResult (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (23): port, emulators, auth, firestore, singleProjectMode, storage, ui, firestore (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (18): listDecisionsForManufacturer(), manufacturerDesignDecisionDocId(), requireDb(), setManufacturerDesignDecision(), assignRoles(), getUserProfile(), requireDb(), saveUserProfile() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (16): createDesignCategory(), createDesignItem(), createDesignSubcategory(), getDesignById(), isMissingIndexError(), listDesignCategories(), listDesignerDesigns(), listDesignSubcategories() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (14): devDependencies, daisyui, firebase-tools, svelte, svelte-check, @sveltejs/adapter-auto, @sveltejs/kit, @sveltejs/vite-plugin-svelte (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (14): scripts, build, check, check:watch, dev, firebase:deploy, firebase:deploy:indexes, firebase:deploy:rules (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (13): 1) Configure environments, 2) Start local Firebase emulators, 3) Deploy rules and indexes, 4) Seed fixed taxonomy (admin), Diseyn, Firebase data model (MVP), Firestore configuration, Get Firebase Admin credentials (service account key) (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.28
Nodes (12): arraysEqual(), getManufacturerProfile(), listAvailableManufacturers(), locationEqual(), ManufacturerProfileUpdate, normalizeIds(), profilePatchChanged(), requireDb() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (7): Coding Rules, Firebase Environment Contract, Firestore composite indexes (required for new query shapes), Firestore Performance Guardrails, Keep This File Up To Date, Marketplace Taxonomy Contract, Project Context

### Community 11 - "Community 11"
Cohesion: 0.47
Nodes (8): assignOakDinnerTaxonomy(), getAdminDb(), getPrivateKey(), main(), requireEnv(), slugify(), upsertCategory(), upsertSubcategory()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): adminAuth, adminDb, adminStorage, getPrivateKey(), getServiceAccount(), serviceAccount

### Community 13 - "Community 13"
Cohesion: 0.39
Nodes (7): createOrder(), listCustomerOrders(), listManufacturerOrders(), requireDb(), updateOrderStatus(), Order, OrderStatus

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (3): svelte, npx, @sveltejs/mcp

## Knowledge Gaps
- **97 isolated node(s):** `npx`, `@sveltejs/mcp`, `rules`, `indexes`, `rules` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 5` to `Community 2`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `svelte` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **What connects `npx`, `@sveltejs/mcp`, `rules` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13257575757575757 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08045977011494253 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12333333333333334 - nodes in this community are weakly interconnected._
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import styles from "./operations.module.css";

type OverviewPayload = {
  schemaVersion: string;
  generatedAt: string;
  environment: string;
  sourceMode: "repository_evidence";
  productionStatus: "not_deployed";
  controls: {
    emergencyPaused: boolean;
    executionEnabled: boolean;
    externalWritesEnabled: boolean;
    approvalsConfigured: boolean;
  };
  featureModules: Array<{ id: string; name: string; enabled: boolean }>;
  baseline: {
    revision: string | null;
    observedAt: string;
    checks: Array<{
      name: string;
      state: "passed" | "failed" | "blocked";
      detail: string;
    }>;
  };
  evidence: Array<{
    id: string;
    sourceType: string;
    source: string;
    observedAt: string;
    freshness: string;
    confidence: string;
    synthetic: boolean;
  }>;
  opportunities: Array<{
    id: string;
    title: string;
    category: string;
    impact: number;
    confidence: number;
    effort: number;
    risk: number;
    score: number;
    scoringVersion: string;
    evidenceIds: string[];
  }>;
  agents: Array<{
    id: string;
    version: string;
    name: string;
    purpose: string;
    mode: string;
    autonomyTier: string;
    modelProvider: string;
    maxRuntimeMs: number;
    maxCostUsd: number;
  }>;
  connectors: Array<{
    id: string;
    name: string;
    status: string;
    access: string;
    lastVerifiedAt: string | null;
    detail: string;
  }>;
  approvals: { pending: number; message: string };
  audit: { entries: unknown[]; message: string };
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: OverviewPayload }
  | { kind: "disabled" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

type ViewId =
  | "overview"
  | "work"
  | "agents"
  | "approvals"
  | "connectors"
  | "audit";

const views: Array<{ id: ViewId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work" },
  { id: "agents", label: "Agents" },
  { id: "approvals", label: "Approvals" },
  { id: "connectors", label: "Connectors" },
  { id: "audit", label: "Audit" },
];

const titleCase = (value: string) =>
  value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const formatObservedAt = (value: string | null) => {
  if (!value) return "Never verified";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
};

function StatePanel({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={styles.statePanel} aria-live="polite">
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{detail}</p>
      {action}
    </section>
  );
}

export default function OperationsCenterClient() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [activeView, setActiveView] = useState<ViewId>("overview");

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setState({
        kind: "error",
        message: "Your session is unavailable. Sign in again to continue.",
      });
      return;
    }

    try {
      const accessResponse = await fetch("/api/v1/operations/access", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (accessResponse.status === 404) {
        setState({ kind: "disabled" });
        return;
      }

      if (accessResponse.status === 401 || accessResponse.status === 403) {
        setState({ kind: "forbidden" });
        return;
      }

      if (!accessResponse.ok) {
        throw new Error(`Access check returned ${accessResponse.status}.`);
      }

      const overviewResponse = await fetch("/api/v1/operations/overview", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (overviewResponse.status === 404) {
        setState({ kind: "disabled" });
        return;
      }

      if (!overviewResponse.ok) {
        throw new Error(`Overview returned ${overviewResponse.status}.`);
      }

      setState({
        kind: "ready",
        data: (await overviewResponse.json()) as OverviewPayload,
      });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The Operations Center could not be loaded.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const evidenceById = useMemo(() => {
    if (state.kind !== "ready") return new Map<string, string>();
    return new Map(state.data.evidence.map((item) => [item.id, item.source]));
  }, [state]);

  if (state.kind === "loading") {
    return (
      <div className={styles.loading} aria-live="polite">
        <div className={styles.loadingMark} aria-hidden="true" />
        <div>
          <span className={styles.eyebrow}>Owner control plane</span>
          <p>Checking access and evidence…</p>
        </div>
      </div>
    );
  }

  if (state.kind === "disabled") {
    return (
      <StatePanel
        eyebrow="Feature unavailable"
        title="Operations Center is disabled"
        detail="The base feature and Overview module must both be enabled for this environment. Production defaults remain off."
      />
    );
  }

  if (state.kind === "forbidden") {
    return (
      <StatePanel
        eyebrow="Access denied"
        title="Owner permission required"
        detail="This control plane is limited to an authenticated tenant owner. Demo and undocumented roles are denied."
      />
    );
  }

  if (state.kind === "error") {
    return (
      <StatePanel
        eyebrow="Control plane unavailable"
        title="The evidence view did not load"
        detail={state.message}
        action={
          <button className={styles.retryButton} type="button" onClick={load}>
            Try again
          </button>
        }
      />
    );
  }

  const data = state.data;

  return (
    <div className={styles.operations}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Owner control plane</span>
          <h1>Operations Center</h1>
          <p className={styles.headerCopy}>
            Repository-grounded oversight for the system behind Pourdex.
          </p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.notDeployed}>Not deployed</span>
          <span>Evidence refreshed {formatObservedAt(data.generatedAt)}</span>
        </div>
      </header>

      <section
        className={styles.trustRail}
        aria-label="Operations trust controls"
      >
        <div className={styles.trustCell}>
          <span>Environment</span>
          <strong>{titleCase(data.environment)}</strong>
          <small>Explicit runtime context</small>
        </div>
        <div className={styles.trustCell}>
          <span>Execution</span>
          <strong
            className={data.controls.emergencyPaused ? styles.paused : ""}
          >
            {data.controls.emergencyPaused ? "Paused" : "Available"}
          </strong>
          <small>
            {data.controls.executionEnabled
              ? "Policy still applies"
              : "Feature policy is off"}
          </small>
        </div>
        <div className={styles.trustCell}>
          <span>External writes</span>
          <strong>
            {data.controls.externalWritesEnabled ? "Enabled" : "Denied"}
          </strong>
          <small>No live side effects</small>
        </div>
        <div className={styles.trustCell}>
          <span>Evidence</span>
          <strong>{data.evidence.length} sources</strong>
          <small>Repository baseline</small>
        </div>
      </section>

      <div className={styles.notice} role="note">
        <span aria-hidden="true">i</span>
        <p>
          This is a read-only repository evidence view. It is not connected to a
          production environment, and no customer or runtime health data is
          shown.
        </p>
      </div>

      <nav className={styles.viewTabs} aria-label="Operations Center views">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            className={activeView === view.id ? styles.activeTab : undefined}
            aria-current={activeView === view.id ? "page" : undefined}
            onClick={() => setActiveView(view.id)}
          >
            {view.label}
            {view.id === "approvals" && data.approvals.pending > 0 ? (
              <span>{data.approvals.pending}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {activeView === "overview" ? (
        <div className={styles.overviewGrid}>
          <section className={`${styles.panel} ${styles.priorityPanel}`}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.eyebrow}>Evidence-ranked</span>
                <h2>Priority queue</h2>
              </div>
              <span className={styles.count}>{data.opportunities.length}</span>
            </div>
            <div className={styles.opportunityList}>
              {data.opportunities.map((opportunity, index) => (
                <article className={styles.opportunity} key={opportunity.id}>
                  <span className={styles.queueIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{opportunity.title}</h3>
                    <p>
                      {titleCase(opportunity.category)} · score{" "}
                      {opportunity.score} · {opportunity.scoringVersion}
                    </p>
                    <div className={styles.evidenceLinks}>
                      {opportunity.evidenceIds.map((evidenceId) => (
                        <code key={evidenceId}>
                          {evidenceById.get(evidenceId) ?? evidenceId}
                        </code>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.eyebrow}>Untouched base</span>
                <h2>Baseline checks</h2>
              </div>
              <span className={styles.revision}>
                {data.baseline.revision?.slice(0, 8) ?? "local"}
              </span>
            </div>
            <div className={styles.checkList}>
              {data.baseline.checks.map((check) => (
                <div className={styles.checkRow} key={check.name}>
                  <span
                    className={`${styles.statusDot} ${styles[check.state]}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>
                      {check.name}
                      <span className={styles.visuallyHidden}>
                        : {titleCase(check.state)}
                      </span>
                    </strong>
                    <small>{check.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.modulePanel}`}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.eyebrow}>Release controls</span>
                <h2>Module flags</h2>
              </div>
            </div>
            <div className={styles.moduleGrid}>
              {data.featureModules.map((module) => (
                <div key={module.id}>
                  <span>{module.name}</span>
                  <strong className={module.enabled ? styles.on : styles.off}>
                    {module.enabled ? "On" : "Off"}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeView === "work" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>Internal backlog</span>
              <h2>Ranked work</h2>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Impact</th>
                  <th>Confidence</th>
                  <th>Effort</th>
                  <th>Risk</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {data.opportunities.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.impact}/5</td>
                    <td>{item.confidence}/5</td>
                    <td>{item.effort}/5</td>
                    <td>{item.risk}/5</td>
                    <td>
                      <strong>{item.score}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeView === "agents" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>Versioned definitions</span>
              <h2>Agent registry</h2>
            </div>
          </div>
          <div className={styles.agentGrid}>
            {data.agents.map((agent) => (
              <article key={agent.id}>
                <div>
                  <span className={styles.mode}>{titleCase(agent.mode)}</span>
                  <span className={styles.tier}>Tier {agent.autonomyTier}</span>
                </div>
                <h3>{agent.name}</h3>
                <p>{agent.purpose}</p>
                <dl>
                  <div>
                    <dt>Version</dt>
                    <dd>{agent.version}</dd>
                  </div>
                  <div>
                    <dt>Runtime cap</dt>
                    <dd>{agent.maxRuntimeMs / 1000}s</dd>
                  </div>
                  <div>
                    <dt>Cost cap</dt>
                    <dd>${agent.maxCostUsd.toFixed(2)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeView === "approvals" ? (
        <section className={styles.emptyPanel}>
          <span className={styles.emptyMark} aria-hidden="true">
            ✓
          </span>
          <span className={styles.eyebrow}>Approval queue</span>
          <h2>No requests waiting</h2>
          <p>{data.approvals.message}</p>
        </section>
      ) : null}

      {activeView === "connectors" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>Least privilege</span>
              <h2>Connector posture</h2>
            </div>
          </div>
          <div className={styles.connectorList}>
            {data.connectors.map((connector) => (
              <article key={connector.id}>
                <div className={styles.connectorIdentity}>
                  <span className={styles.connectorMark}>
                    {connector.name.charAt(0)}
                  </span>
                  <div>
                    <h3>{connector.name}</h3>
                    <p>{connector.detail}</p>
                  </div>
                </div>
                <div className={styles.connectorStatus}>
                  <strong>{titleCase(connector.status)}</strong>
                  <span>
                    {titleCase(connector.access)} ·{" "}
                    {formatObservedAt(connector.lastVerifiedAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeView === "audit" ? (
        <section className={styles.emptyPanel}>
          <span className={styles.emptyMark} aria-hidden="true">
            0
          </span>
          <span className={styles.eyebrow}>Append-only history</span>
          <h2>No Operations events</h2>
          <p>{data.audit.message}</p>
        </section>
      ) : null}
    </div>
  );
}

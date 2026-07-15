"use client";

import { useState } from "react";
import { Activity, Check, CircleDollarSign, Github, Leaf, Play, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Provider } from "@/lib/contracts";
import type { MockRunResult } from "@/lib/orchestrator";

const providerOptions: Array<{ id: Provider; label: string; role: string }> = [
  { id: "FREEMODEL", label: "FreeModel", role: "Primary implementation" },
  { id: "OPENAI", label: "OpenAI", role: "Small isolated tasks" },
  { id: "GROQ", label: "Groq Cloud", role: "Independent review" },
  { id: "GEMINI", label: "Gemini", role: "Evidence verification" },
];

export function RunConsole() {
  const [providers, setProviders] = useState<Provider[]>(providerOptions.map((provider) => provider.id));
  const [task, setTask] = useState("Add strict request validation and regression tests");
  const [maxTokens, setMaxTokens] = useState(12_000);
  const [maxCostUsd, setMaxCostUsd] = useState(1);
  const [run, setRun] = useState<MockRunResult>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function toggleProvider(provider: Provider) {
    setProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);
  }

  async function startRun() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, providers, maxTokens, maxCostUsd }),
      });
      if (!response.ok) throw new Error("Review the task, provider selection, and hard budgets.");
      setRun(await response.json() as MockRunResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Run could not start");
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="Ecotokens workspace"><Leaf size={19} /> ECOTOKENS</a>
        <div className="topbar-meta"><span className="status-dot" /> MOCK MODE <a href="https://github.com" aria-label="GitHub repository"><Github size={18} /></a></div>
      </header>

      <section className="workspace" id="workspace">
        <aside className="rail" aria-label="Run configuration">
          <div>
            <p className="eyebrow">NEW BOUNDED RUN</p>
            <h1>Ship code.<br />Spend less context.</h1>
            <p className="intro">Compact task packets, fixed budgets, independent checks, and human-owned draft pull requests.</p>
          </div>

          <div className="form-stack">
            <label htmlFor="task">Task</label>
            <textarea id="task" value={task} onChange={(event) => setTask(event.target.value)} maxLength={4_000} />

            <fieldset>
              <legend>Provider roles</legend>
              <div className="provider-list">
                {providerOptions.map((provider) => {
                  const selected = providers.includes(provider.id);
                  return (
                    <label className="provider-row" key={provider.id}>
                      <input type="checkbox" checked={selected} onChange={() => toggleProvider(provider.id)} />
                      <span className="checkmark">{selected ? <Check size={13} /> : null}</span>
                      <span><strong>{provider.label}</strong><small>{provider.role}</small></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="budget-grid">
              <label>Token cap<input type="number" min="500" max="1000000" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} /></label>
              <label>USD cap<input type="number" min="0.01" max="100" step="0.01" value={maxCostUsd} onChange={(event) => setMaxCostUsd(Number(event.target.value))} /></label>
            </div>

            <button className="run-button" type="button" onClick={startRun} disabled={pending || providers.length === 0}>
              <Play size={17} fill="currentColor" /> {pending ? "Running bounded workflow" : "Start bounded run"}
            </button>
            {error ? <p className="error"><TriangleAlert size={15} /> {error}</p> : null}
          </div>
        </aside>

        <div className="run-surface" aria-live="polite">
          <div className="surface-heading">
            <div><p className="eyebrow">ORCHESTRATOR / LIVE EVIDENCE</p><h2>{run ? run.branch : "No run started"}</h2></div>
            <span className={`state ${run?.state === "BUDGET_EXHAUSTED" ? "stopped" : ""}`}>{run?.state ?? "READY"}</span>
          </div>

          {run ? (
            <>
              <section className="metrics" aria-label="Run metrics">
                <article><span><Activity size={16} /> Calls</span><strong>{run.usage.calls}<small> / 8</small></strong></article>
                <article><span><CircleDollarSign size={16} /> Est. cost</span><strong>${run.usage.estimatedCostUsd.toFixed(4)}</strong></article>
                <article className="savings"><span><Leaf size={16} /> Measured savings</span><strong>{run.savings.savingsPercent}%</strong><small>{run.savings.targetMet ? "70% target met" : "Below 70% target"}</small></article>
              </section>

              <section className="timeline" aria-label="Run timeline">
                {run.steps.map((item, index) => (
                  <article className="timeline-row" key={item.id}>
                    <div className={`step-index ${item.state}`}>{item.state === "passed" ? <Check size={14} /> : index + 1}</div>
                    <div><strong>{item.label}</strong><span>{item.provider ?? "Orchestrator policy"}</span></div>
                    <code>{item.tokens.toLocaleString()} tok</code>
                  </article>
                ))}
              </section>

              <section className="result-band">
                <div><ShieldCheck size={22} /><span><strong>{run.pullRequest ? "Draft pull request ready" : "Run stopped safely"}</strong><small>{run.coverage.join(" · ")}</small></span></div>
                {run.pullRequest ? <a href={run.pullRequest.url}>Open mock PR</a> : null}
              </section>

              <div className="measurement-note">
                Savings compare {run.savings.actualTokens.toLocaleString()} actual task-packet tokens with a {run.savings.baselineTokens.toLocaleString()} full-context baseline. This is measured simulation data, not a universal production guarantee.
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-mark"><Leaf size={34} /></div>
              <h3>Evidence appears here</h3>
              <p>Configure at least one provider and start the deterministic mock workflow. No external API key is used in this release.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

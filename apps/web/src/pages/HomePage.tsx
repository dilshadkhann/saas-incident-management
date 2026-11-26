import { useState } from "react";

const features = [
  {
    number: "01",
    title: "Incident management",
    description:
      "Create, assign, investigate, and resolve incidents with a clear view of their status and severity.",
    icon: "!",
    tone: "violet",
  },
  {
    number: "02",
    title: "Service health",
    description:
      "Keep your services organized and make their operational status visible to the entire team.",
    icon: "↗",
    tone: "blue",
  },
  {
    number: "03",
    title: "Audit history",
    description:
      "Maintain a traceable record of important activity across your organization and its incidents.",
    icon: "◷",
    tone: "amber",
  },
  {
    number: "04",
    title: "Team collaboration",
    description:
      "Bring administrators and responders together with organization-level roles and permissions.",
    icon: "◎",
    tone: "green",
  },
];

const workflow = [
  {
    number: "01",
    title: "Create an incident",
    description:
      "Record the issue, select its affected service, and set its severity.",
    icon: "＋",
  },
  {
    number: "02",
    title: "Investigate together",
    description:
      "Assign responsibility, add updates, and keep investigation activity in one place.",
    icon: "⌕",
  },
  {
    number: "03",
    title: "Track progress",
    description:
      "Move through incident states as the team identifies and monitors the issue.",
    icon: "↗",
  },
  {
    number: "04",
    title: "Resolve with clarity",
    description:
      "Close the incident and retain its activity history for future reference.",
    icon: "✓",
  },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <a
      className={`home-brand${light ? " home-brand-light" : ""}`}
      href="/"
      aria-label="OpsHub home"
    >
      <span className="home-brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span>Ops<span className="home-brand-accent">Hub</span></span>
    </a>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10h11m-4.5-4.5L15.5 10 11 14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m4.5 10.2 3.6 3.5 7.4-7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductPreview() {
  const [activeTab, setActiveTab] = useState<"overview" | "incidents">(
    "overview",
  );

  return (
    <div className="home-preview-wrap">
      <div className="home-preview-glow" />

      <div className="home-floating-card home-floating-top">
        <span className="home-floating-icon home-floating-icon-green">✓</span>
        <span>
          <strong>Service operational</strong>
          <small>All systems looking good</small>
        </span>
        <span className="home-live-dot" />
      </div>

      <div className="home-dashboard">
        <div className="home-dashboard-top">
          <div className="home-dashboard-brand">
            <span className="home-mini-mark">O</span>
            <span>OpsHub</span>
            <span className="home-demo-tag">PRODUCT PREVIEW</span>
          </div>
          <div className="home-dashboard-avatar">JD</div>
        </div>

        <div className="home-dashboard-body">
          <aside className="home-dashboard-sidebar">
            <span className="home-sidebar-label">WORKSPACE</span>
            <span className="home-sidebar-item home-sidebar-active">
              <span>▦</span> Overview
            </span>
            <span className="home-sidebar-item"><span>◈</span> Services</span>
            <span className="home-sidebar-item"><span>◉</span> Incidents</span>
            <span className="home-sidebar-item"><span>◷</span> Activity</span>
            <div className="home-sidebar-bottom">
              <span className="home-sidebar-label">WORKSPACE</span>
              <span className="home-sidebar-item"><span>⚙</span> Settings</span>
            </div>
          </aside>

          <div className="home-dashboard-main">
            <div className="home-dashboard-heading">
              <div>
                <span className="home-dashboard-eyebrow">WORKSPACE OVERVIEW</span>
                <h3>Good morning, team</h3>
                <p>Here is what's happening in your workspace.</p>
              </div>
              <span className="home-dashboard-date">Today</span>
            </div>

            <div className="home-preview-stats">
              <div className="home-preview-stat">
                <span>Services</span>
                <strong>08</strong>
                <small><i className="home-stat-green" /> Registered services</small>
              </div>
              <div className="home-preview-stat">
                <span>Active incidents</span>
                <strong>02</strong>
                <small><i className="home-stat-amber" /> Needs attention</small>
              </div>
              <div className="home-preview-stat">
                <span>Resolved</span>
                <strong>14</strong>
                <small><i className="home-stat-blue" /> Incident history</small>
              </div>
            </div>

            <div className="home-preview-content">
              <div className="home-preview-panel">
                <div className="home-preview-panel-heading">
                  <strong>Workspace activity</strong>
                  <span>Illustrative</span>
                </div>
                <div className="home-preview-tabs">
                  <button
                    className={activeTab === "overview" ? "active" : ""}
                    onClick={() => setActiveTab("overview")}
                    type="button"
                  >
                    Services
                  </button>
                  <button
                    className={activeTab === "incidents" ? "active" : ""}
                    onClick={() => setActiveTab("incidents")}
                    type="button"
                  >
                    Incidents
                  </button>
                </div>

                {activeTab === "overview" ? (
                  <div className="home-preview-list">
                    <div className="home-preview-row">
                      <span className="home-service-symbol">A</span>
                      <span className="home-preview-row-copy">
                        <strong>API Gateway</strong><small>Core service</small>
                      </span>
                      <span className="home-status-pill operational">Operational</span>
                    </div>
                    <div className="home-preview-row">
                      <span className="home-service-symbol blue">D</span>
                      <span className="home-preview-row-copy">
                        <strong>Database</strong><small>Data service</small>
                      </span>
                      <span className="home-status-pill operational">Operational</span>
                    </div>
                    <div className="home-preview-row">
                      <span className="home-service-symbol amber">P</span>
                      <span className="home-preview-row-copy">
                        <strong>Payment service</strong><small>Business service</small>
                      </span>
                      <span className="home-status-pill degraded">Degraded</span>
                    </div>
                  </div>
                ) : (
                  <div className="home-preview-list">
                    <div className="home-preview-row">
                      <span className="home-severity-dot" />
                      <span className="home-preview-row-copy">
                        <strong>Payment latency</strong><small>Investigating · SEV2</small>
                      </span>
                      <span className="home-status-pill degraded">Active</span>
                    </div>
                    <div className="home-preview-row">
                      <span className="home-severity-dot minor" />
                      <span className="home-preview-row-copy">
                        <strong>API response errors</strong><small>Monitoring · SEV3</small>
                      </span>
                      <span className="home-status-pill monitoring">Monitoring</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="home-preview-side-panel">
                <strong>Incident lifecycle</strong>
                <p>Follow progress from investigation through resolution.</p>
                <div className="home-lifecycle">
                  <span className="done"><i>✓</i> Investigating</span>
                  <span className="done"><i>✓</i> Identified</span>
                  <span className="current"><i>•</i> Monitoring</span>
                  <span><i>○</i> Resolved</span>
                </div>
              </div>
            </div>
            <div className="home-preview-disclaimer">
              Illustrative interface · Sample data, not live system information
            </div>
          </div>
        </div>
      </div>

      <div className="home-floating-card home-floating-bottom">
        <span className="home-floating-icon home-floating-icon-violet">↗</span>
        <span>
          <strong>Incident activity</strong>
          <small>Updates in one place</small>
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <Brand />

          <nav className="home-nav" aria-label="Main navigation">
            <a href="#platform">Platform</a>
            <a href="#workflow">How it works</a>
            <a href="#security">Security</a>
          </nav>

          <div className="home-header-actions">
            <a className="home-signin" href="/login">Sign in</a>
            <a className="home-button home-button-primary home-button-small" href="/register">
              Get started <ArrowIcon />
            </a>
          </div>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-grid" aria-hidden="true" />
        <div className="home-hero-orb home-hero-orb-one" aria-hidden="true" />
        <div className="home-hero-orb home-hero-orb-two" aria-hidden="true" />

        <div className="home-container home-hero-inner">
          <div className="home-hero-copy">
            <div className="home-eyebrow">
              <span className="home-eyebrow-dot" />
              INCIDENT MANAGEMENT, MADE CLEARER
            </div>

            <h1>
              Incidents happen.
              <span> Stay in control.</span>
            </h1>

            <p className="home-hero-description">
              Bring your services, incidents, and response activity together.
              Give your team the clarity to act when it matters most.
            </p>

            <div className="home-hero-actions">
              <a className="home-button home-button-primary" href="/register">
                Create your workspace <ArrowIcon />
              </a>
              <a className="home-button home-button-secondary" href="#platform">
                Explore the platform
              </a>
            </div>

            <div className="home-hero-assurance">
              <span><CheckIcon /> Organization-based workspaces</span>
              <span><CheckIcon /> Role-based access</span>
            </div>
          </div>

          <ProductPreview />
        </div>

        <div className="home-hero-bottom">
          <span>BUILT FOR CLEARER INCIDENT RESPONSE</span>
          <span className="home-scroll-line" />
          <a href="#platform">Discover OpsHub ↓</a>
        </div>
      </section>

      <section className="home-intro-strip">
        <div className="home-container home-intro-inner">
          <p>Everything your team needs to bring incident work into focus.</p>
          <div className="home-intro-points">
            <span><i /> One workspace</span>
            <span><i /> Clear ownership</span>
            <span><i /> Traceable activity</span>
          </div>
        </div>
      </section>

      <section className="home-section home-platform" id="platform">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-section-kicker">THE PLATFORM</span>
            <h2>
              Less scattered work.
              <span> More operational clarity.</span>
            </h2>
            <p>
              A focused workspace for managing the services your team owns
              and the incidents that affect them.
            </p>
          </div>

          <div className="home-feature-grid">
            {features.map((feature) => (
              <article className="home-feature-card" key={feature.number}>
                <div className={`home-feature-icon ${feature.tone}`}>
                  {feature.icon}
                </div>
                <span className="home-feature-number">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="home-feature-line" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-workflow-section" id="workflow">
        <div className="home-container home-workflow-layout">
          <div className="home-workflow-intro">
            <span className="home-section-kicker">A CLEARER WORKFLOW</span>
            <h2>From first signal to resolution.</h2>
            <p>
              Keep the response process understandable. Give every incident
              a place, every update a record, and every team member a clear role.
            </p>
            <a className="home-text-link" href="/register">
              Bring your team to OpsHub <ArrowIcon />
            </a>
          </div>

          <div className="home-workflow-list">
            {workflow.map((step) => (
              <article className="home-workflow-step" key={step.number}>
                <div className="home-workflow-step-icon">{step.icon}</div>
                <div className="home-workflow-step-copy">
                  <span>STEP {step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <span className="home-workflow-step-arrow">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-security" id="security">
        <div className="home-container home-security-layout">
          <div className="home-security-visual">
            <div className="home-security-orbit orbit-one" />
            <div className="home-security-orbit orbit-two" />
            <div className="home-security-core">
              <div className="home-security-shield">
                <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <path d="M32 6 53 14v15c0 14-8.8 23.2-21 29C19.8 52.2 11 43 11 29V14L32 6Z" stroke="currentColor" strokeWidth="2.5" />
                  <path d="m22 31 7 7 14-15" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <strong>Built around<br />your organization</strong>
              <span>CONTROL · CLARITY · ACCOUNTABILITY</span>
            </div>
          </div>

          <div className="home-security-copy">
            <span className="home-section-kicker">SECURITY & ACCOUNTABILITY</span>
            <h2>Structure your workspace. Protect access. Track activity.</h2>
            <p>
              OpsHub is designed around organization-level access and
              accountable incident workflows, helping teams work with
              the right permissions and a clearer activity history.
            </p>

            <div className="home-security-points">
              <div>
                <span><CheckIcon /></span>
                <div><strong>Organization-level isolation</strong><p>Keep workspace data scoped to its organization.</p></div>
              </div>
              <div>
                <span><CheckIcon /></span>
                <div><strong>Role-based permissions</strong><p>Separate administrator, responder, and viewer responsibilities.</p></div>
              </div>
              <div>
                <span><CheckIcon /></span>
                <div><strong>Auditable activity</strong><p>Maintain a record of important incident and workspace actions.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-cta-section">
        <div className="home-cta-glow" />
        <div className="home-container home-cta-inner">
          <span className="home-section-kicker">TAKE CONTROL OF THE RESPONSE</span>
          <h2>Make incident work<br /><span>feel more manageable.</span></h2>
          <p>Start with a workspace built to keep your team and operational work connected.</p>
          <div className="home-cta-actions">
            <a className="home-button home-button-white" href="/register">
              Get started with OpsHub <ArrowIcon />
            </a>
            <a className="home-cta-signin" href="/login">Already have an account? Sign in</a>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-container">
          <div className="home-footer-main">
            <div className="home-footer-brand">
              <Brand light />
              <p>Clarity for the moments that matter.</p>
            </div>

            <div className="home-footer-links">
              <div>
                <strong>EXPLORE</strong>
                <a href="#platform">Platform</a>
                <a href="#workflow">How it works</a>
                <a href="#security">Security</a>
              </div>
              <div>
                <strong>YOUR WORKSPACE</strong>
                <a href="/login">Sign in</a>
                <a href="/register">Get started</a>
              </div>
            </div>
          </div>
          <div className="home-footer-bottom">
            <span>© {new Date().getFullYear()} OpsHub. All rights reserved.</span>
            <span>Built for better incident response.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
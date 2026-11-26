import type { ReactNode } from 'react'
import { Link } from 'react-router'

type AuthExperienceProps = {
  children: ReactNode
  variant: 'login' | 'register'
}

const activity = [
  {
    time: '10:42:08',
    title: 'Incident detected',
    detail: 'Payment API latency elevated',
    status: 'Detected',
    tone: 'auth-dot-red',
  },
  {
    time: '10:44:21',
    title: 'Investigation started',
    detail: 'Responder assigned to incident',
    status: 'Investigating',
    tone: 'auth-dot-amber',
  },
  {
    time: '10:51:36',
    title: 'Service stabilized',
    detail: 'Response time returning to normal',
    status: 'Monitoring',
    tone: 'auth-dot-green',
  },
]

function AuthExperience({ children, variant }: AuthExperienceProps) {
  const isLogin = variant === 'login'

  return (
    <main className="auth-experience">
      <section className="auth-visual" aria-label="About OpsHub">
        <div className="auth-visual-grid" aria-hidden="true" />
        <div className="auth-orb auth-orb-one" aria-hidden="true" />
        <div className="auth-orb auth-orb-two" aria-hidden="true" />

        <div className="auth-visual-content">
          <Link to="/" className="auth-brand" aria-label="OpsHub home">
            <span className="auth-brand-mark">O</span>
            <span>OpsHub</span>
          </Link>

          <div className="auth-message">
            <span className="auth-eyebrow">
              <span className="auth-eyebrow-dot" />
              INCIDENT OPERATIONS PLATFORM
            </span>

            <h1>
              {isLogin ? (
                <>
                  Good to have
                  <br />
                  you <span>back.</span>
                </>
              ) : (
                <>
                  Make every
                  <br />
                  response <span>count.</span>
                </>
              )}
            </h1>

            <p>
              {isLogin
                ? 'Your services, incidents and team activity are right where you left them. Pick up with clarity.'
                : 'Bring your people and services into one workspace. Build a response process your whole team can rely on.'}
            </p>
          </div>

          <div className="auth-activity-card">
            <div className="auth-activity-header">
              <div>
                <span className="auth-card-kicker">LIVE WORKFLOW PREVIEW</span>
                <h2>Incident activity</h2>
              </div>
              <span className="auth-live-indicator">
                <span />
                ACTIVITY
              </span>
            </div>

            <div className="auth-timeline">
              {activity.map((item, index) => (
                <div className="auth-timeline-item" key={item.time}>
                  <div className="auth-timeline-rail">
                    <span className={`auth-timeline-dot ${item.tone}`} />
                    {index !== activity.length - 1 && <span className="auth-timeline-line" />}
                  </div>
                  <div className="auth-timeline-copy">
                    <div className="auth-timeline-title">
                      <strong>{item.title}</strong>
                      <time>{item.time}</time>
                    </div>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="auth-activity-footer">
              <span className="auth-footer-check">✓</span>A clear record from detection to
              resolution
            </div>
          </div>

          <div className="auth-visual-bottom">
            <span>BUILT FOR OPERATIONAL CLARITY</span>
            <span>ONE WORKSPACE. SHARED CONTEXT.</span>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <Link to="/" className="auth-brand auth-brand-light">
            <span className="auth-brand-mark">O</span>
            <span>OpsHub</span>
          </Link>
        </div>

        <div className="auth-form-content">{children}</div>

        <p className="auth-form-footer">
          <span>© {new Date().getFullYear()} OpsHub</span>
          <span>Incident operations, with clarity and control.</span>
        </p>
      </section>
    </main>
  )
}

export default AuthExperience

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import AuthExperience from '../../layouts/AuthExperience'
import { useAuth } from '../../lib/use-auth'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const registered = (location.state as { registered?: boolean } | null)?.registered === true
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthExperience variant="login">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            YOUR WORKSPACE AWAITS
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Welcome back
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to manage your services and incidents.
          </p>

          {registered && (
            <p
              className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700"
              role="status"
            >
              Account created successfully. You can now sign in.
            </p>
          )}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-input w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="auth-submit w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in to OpsHub'}
            {!submitting && (
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            )}
          </button>
        </form>

        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">NEW TO OPSHUB?</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link
            className="font-semibold text-indigo-600 transition hover:text-indigo-700"
            to="/register"
          >
            Create an account
          </Link>
        </p>

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">
          By continuing, you&apos;re accessing your organization&apos;s operational workspace.
        </p>
      </div>
    </AuthExperience>
  )
}

export default LoginPage

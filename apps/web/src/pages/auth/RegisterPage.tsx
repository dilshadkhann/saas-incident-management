import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthExperience from '../../layouts/AuthExperience'
import { apiRequest } from '../../lib/api-client'

function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      })
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthExperience variant="register">
      <div className="w-full max-w-md">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            GET YOUR TEAM STARTED
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Create your account
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Set up your access and start building a clearer response process.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              id="name"
              required
              maxLength={150}
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="auth-input w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-input w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Use at least 12 characters.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="auth-submit mt-2 w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Create your account'}
            {!submitting && <span aria-hidden="true" className="ml-2">→</span>}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">ALREADY WITH US?</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <p className="text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link className="font-semibold text-indigo-600 transition hover:text-indigo-700" to="/login">
            Sign in
          </Link>
        </p>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Your account will be ready for organization setup after registration.
        </p>
      </div>
    </AuthExperience>
  )
}

export default RegisterPage

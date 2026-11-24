import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
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
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">OpsHub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage your services and incidents.
        </p>
        {registered && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">
            Account created successfully. You can now sign in.
          </p>
        )}
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to OpsHub?{' '}
        <Link className="font-semibold text-indigo-600 hover:text-indigo-700" to="/register">
          Create an account
        </Link>
      </p>
    </div>
  )
}
export default LoginPage

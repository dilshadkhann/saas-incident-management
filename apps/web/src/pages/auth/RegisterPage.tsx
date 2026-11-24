import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
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
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">OpsHub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-500">Start managing incidents and service health.</p>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            required
            maxLength={150}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
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
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <p className="mt-1 text-xs text-slate-500">Use at least 12 characters.</p>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link className="font-semibold text-indigo-600 hover:text-indigo-700" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}
export default RegisterPage

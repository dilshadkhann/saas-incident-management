import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/use-auth'

function OrganizationSetupPage() {
  const { createOrganization } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await createOrganization(name.trim())
      navigate('/workspace', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your organization.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
        OpsHub setup
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        Create your organization
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Organizations keep your services, incidents, and team members together. Create one to get
        your workspace started.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="organization-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Organization name
          </label>
          <input
            id="organization-name"
            required
            minLength={2}
            maxLength={150}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Inc."
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
          disabled={submitting || name.trim().length < 2}
          className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating organization…' : 'Create organization'}
        </button>
      </form>
    </div>
  )
}

export default OrganizationSetupPage

import { Link, Outlet } from 'react-router'

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Link to="/" className="flex items-center gap-3" aria-label="OpsHub home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              O
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">OpsHub</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="/#platform" className="transition hover:text-slate-950">
              Platform
            </a>
            <a href="/#workflow" className="transition hover:text-slate-950">
              How it works
            </a>
            <a href="/#security" className="transition hover:text-slate-950">
              Security
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get started{' '}
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </Link>
          </div>
        </nav>
      </header>

      <section className="flex flex-1 flex-col">
        <Outlet />
      </section>
    </div>
  )
}

export default PublicLayout

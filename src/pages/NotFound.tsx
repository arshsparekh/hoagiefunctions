import { Link } from 'react-router-dom'
import { PageContainer } from '../components/PageContainer'

export default function NotFound() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-mono text-[12px] uppercase tracking-widest text-pink-500">404</p>
        <h1 className="font-brand text-[22px] font-bold text-pink-900">Page not found</h1>
        <p className="text-muted">That page doesn't exist or has moved.</p>
        <Link
          to="/"
          className="mt-2 rounded-md bg-pink-500 px-4 py-2 text-[13px] font-semibold text-white shadow-hoagie transition-colors hover:bg-pink-600"
        >
          Back home
        </Link>
      </div>
    </PageContainer>
  )
}

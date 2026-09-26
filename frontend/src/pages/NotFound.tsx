import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="shell py-32 text-center">
      <h1 className="text-4xl">This road doesn't go anywhere</h1>
      <p className="mt-3 text-slate-400">The page you asked for isn't here.</p>
      <Link to="/" className="btn-primary mt-8">Back to the start</Link>
    </div>
  )
}

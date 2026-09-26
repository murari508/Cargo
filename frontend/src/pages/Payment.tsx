import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorNote, PageHeader, Spinner } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { api, rupees } from '../services/api'

export default function Payment() {
  const { bookingId } = useParams()
  const id = Number(bookingId)
  const navigate = useNavigate()

  const booking = useAsync(() => api.bookings.one(id), [id])
  const methods = useAsync(() => api.payments.methods(), [])
  const [method, setMethod] = useState('upi')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    setBusy(true)
    setError(null)
    try {
      // 1. ask CarGo to open an order with the payment provider
      const order = await api.payments.create(id, method)
      // 2. the provider's checkout takes the card or UPI PIN and signs a receipt.
      //    In development that step is the mock checkout below; CarGo never sees
      //    the credentials either way.
      const receipt = await api.payments.mockCheckout(order.order_id, order.checkout_token)
      if (!receipt.signature) throw new Error('The payment was declined. Try another method.')
      // 3. CarGo verifies the signature before it confirms anything
      await api.payments.verify({
        order_id: order.order_id,
        checkout_token: order.checkout_token,
        signature: receipt.signature,
      })
      navigate(`/confirmation/${id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (booking.loading) return <div className="shell"><Spinner /></div>
  if (!booking.data) return <div className="shell py-10"><ErrorNote message="Booking not found" /></div>
  const b = booking.data

  return (
    <div className="shell max-w-3xl py-10">
      <PageHeader title="Payment"
        subtitle={`Booking ${b.booking_reference} is held for you while you pay.`} />

      <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
        <div className="card space-y-4 p-6">
          <h2 className="text-lg">How would you like to pay?</h2>
          <div className="space-y-2">
            {(methods.data?.methods ?? []).map(m => (
              <label key={m.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm
                  transition ${method === m.id
                    ? 'border-signal/60 bg-signal/5 text-white'
                    : 'border-ink-600 text-slate-300 hover:border-white/25'}`}>
                <input type="radio" name="method" value={m.id} checked={method === m.id}
                  onChange={() => setMethod(m.id)} className="accent-signal" />
                {m.label}
              </label>
            ))}
          </div>

          <p className="rounded-xl border border-ink-600 bg-ink-900/60 p-4 text-xs text-slate-400">
            {methods.data?.note ?? 'Card details never reach CarGo.'}
            {methods.data?.provider === 'mock' &&
              ' This build uses the development provider, so no money moves.'}
          </p>

          {error && <ErrorNote message={error} />}

          <button onClick={pay} disabled={busy} className="btn-primary w-full">
            {busy ? 'Processing…' : `Pay ${rupees(b.total_amount)}`}
          </button>
        </div>

        <aside className="card h-fit space-y-2 p-6 text-sm">
          <h2 className="mb-2 text-lg">Summary</h2>
          <Row k="Rental" v={rupees(b.base_price)} />
          <Row k="Taxes" v={rupees(b.taxes)} />
          <Row k="Service fee" v={rupees(b.service_fee)} />
          <Row k="Security deposit" v={rupees(b.security_deposit)} />
          <div className="flex justify-between border-t border-ink-600 pt-3 font-display text-lg text-white">
            <span>Total</span><span>{rupees(b.total_amount)}</span>
          </div>
          <p className="pt-2 text-xs text-slate-500">
            {b.pickup_date} → {b.return_date} · {b.rental_days} days
          </p>
        </aside>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-slate-400">
    <span>{k}</span><span className="text-slate-200">{v}</span></div>
}

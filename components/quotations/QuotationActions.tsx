'use client'
import { useActionState } from 'react'
import {
  approveQuotation,
  rejectQuotation,
  sendQuotation,
} from '@/lib/actions/quotations'
import { Button } from '@/components/ui/button'

interface QuotationActionsProps {
  quotationId: string
  status: string
  approvedAt?: string | null
  rejectedAt?: string | null
}

export function QuotationActions({
  quotationId,
  status,
  approvedAt,
  rejectedAt,
}: QuotationActionsProps) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveQuotation.bind(null, quotationId),
    null
  )
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectQuotation.bind(null, quotationId),
    null
  )
  const [sendState, sendAction, sendPending] = useActionState(
    sendQuotation.bind(null, quotationId),
    null
  )

  const anyPending = approvePending || rejectPending || sendPending
  const error = approveState?.error ?? rejectState?.error ?? sendState?.error

  if (status === 'approved') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Disetujui{' '}
        {approvedAt &&
          new Date(approvedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Ditolak{' '}
        {rejectedAt &&
          new Date(rejectedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {status === 'draft' && (
          <form action={sendAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={anyPending}
            >
              {sendPending ? 'Memproses…' : 'Ubah ke Sent'}
            </Button>
          </form>
        )}
        <form action={approveAction}>
          <Button type="submit" size="sm" disabled={anyPending}>
            {approvePending ? 'Memproses…' : 'Approve'}
          </Button>
        </form>
        <form action={rejectAction}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={anyPending}
          >
            {rejectPending ? 'Memproses…' : 'Reject'}
          </Button>
        </form>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

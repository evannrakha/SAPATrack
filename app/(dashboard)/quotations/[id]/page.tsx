import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QuotationActions } from '@/components/quotations/QuotationActions'
import type { QuotationDetail, QuotationItemDetail } from '@/lib/types/quotations'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'border-transparent bg-secondary text-secondary-foreground',
  },
  sent: {
    label: 'Sent',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  approved: {
    label: 'Approved',
    className: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  },
  rejected: {
    label: 'Rejected',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
}

const categoryLabel: Record<string, string> = {
  vehicle: 'Kendaraan',
  heavy_equipment: 'Alat Berat',
}

const rateTypeLabel: Record<string, string> = {
  hourly: '/jam',
  daily: '/hari',
}

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: quotation }, { data: items }] = await Promise.all([
    supabase
      .from('quotations')
      .select(
        'id, number, status, discount_amount, tax_percentage, notes, valid_until, created_at, approved_at, rejected_at, sent_at, project_id, clients(company_name), projects(name, location)'
      )
      .eq('id', id)
      .single()
      .returns<QuotationDetail>(),
    supabase
      .from('quotation_items')
      .select('id, duration, rate_snapshot, rate_type, subtotal, units(id, code, name, category)')
      .eq('quotation_id', id)
      .returns<QuotationItemDetail[]>(),
  ])

  if (!quotation) notFound()

  const subtotalItems = (items ?? []).reduce((sum, item) => sum + item.subtotal, 0)
  const afterDiscount = subtotalItems - quotation.discount_amount
  const taxAmount = afterDiscount * (quotation.tax_percentage / 100)
  const grandTotal = afterDiscount + taxAmount

  const config = statusConfig[quotation.status] ?? { label: quotation.status, className: '' }
  const client = Array.isArray(quotation.clients) ? quotation.clients[0] : quotation.clients
  const project = Array.isArray(quotation.projects) ? quotation.projects[0] : quotation.projects

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/quotations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Quotations
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-mono">{quotation.number}</h1>
            <Badge className={config.className}>{config.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Dibuat{' '}
            {new Date(quotation.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <QuotationActions
          quotationId={quotation.id}
          status={quotation.status}
          approvedAt={quotation.approved_at}
          rejectedAt={quotation.rejected_at}
        />
      </div>

      {/* Info Klien & Proyek */}
      <div className="rounded-xl border p-6 grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Klien</p>
          <p className="font-medium">{client?.company_name ?? '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Proyek</p>
          <p className="font-medium">{project?.name ?? '—'}</p>
          {project?.location && (
            <p className="text-sm text-muted-foreground">{project.location}</p>
          )}
        </div>
        {quotation.valid_until && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Berlaku Hingga</p>
            <p className="font-medium">
              {new Date(quotation.valid_until).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
        {quotation.notes && (
          <div className="space-y-1 col-span-2">
            <p className="text-xs text-muted-foreground font-medium">Catatan</p>
            <p className="text-sm">{quotation.notes}</p>
          </div>
        )}
      </div>

      {/* Tabel Items */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Tarif</TableHead>
              <TableHead className="text-right">Durasi</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.length ? (
              items.map((item) => {
                const unit = Array.isArray(item.units) ? item.units[0] : item.units
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        {unit ? (
                          <Link
                            href={`/fleet/${unit.id}`}
                            className="hover:underline"
                          >
                            {unit.code}
                          </Link>
                        ) : '—'}
                      </div>
                      {unit?.name && (
                        <div className="text-sm text-muted-foreground">{unit.name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {unit ? (categoryLabel[unit.category] ?? unit.category) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmt(item.rate_snapshot)}{rateTypeLabel[item.rate_type] ?? ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.duration}{' '}
                      <span className="text-muted-foreground text-sm">
                        {item.rate_type === 'hourly' ? 'jam' : 'hari'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(item.subtotal)}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Tidak ada item
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ringkasan Total */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2 rounded-xl border p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(subtotalItems)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Diskon</span>
            <span className="text-destructive">- {fmt(quotation.discount_amount)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Setelah Diskon</span>
            <span>{fmt(afterDiscount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">PPN {quotation.tax_percentage}%</span>
            <span>{fmt(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Grand Total</span>
            <span>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

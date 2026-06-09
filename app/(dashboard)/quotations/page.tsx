import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus } from 'lucide-react'
import type { QuotationListItem } from '@/lib/types/quotations'

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

const filterStatuses = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)
}

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: allStatuses }, { data: quotations }] = await Promise.all([
    supabase.from('quotation_totals').select('status'),
    filterStatus
      ? supabase
          .from('quotation_totals')
          .select('id, number, client_name, project_name, status, grand_total, created_at')
          .eq('status', filterStatus)
          .order('created_at', { ascending: false })
          .returns<QuotationListItem[]>()
      : supabase
          .from('quotation_totals')
          .select('id, number, client_name, project_name, status, grand_total, created_at')
          .order('created_at', { ascending: false })
          .returns<QuotationListItem[]>(),
  ])

  const statusCounts = (allStatuses ?? []).reduce<Record<string, number>>((acc, q) => {
    const key = q.status as string
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const filterBase =
    'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotations</h1>
          <p className="text-sm text-muted-foreground">
            Daftar penawaran harga sewa alat berat
          </p>
        </div>
        <Button asChild>
          <Link href="/quotations/new">
            <Plus className="size-4" />
            Quotation Baru
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/quotations"
          className={[
            filterBase,
            !filterStatus
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          Semua ({allStatuses?.length ?? 0})
        </Link>
        {filterStatuses.map(({ label, value }) => (
          <Link
            key={value}
            href={`/quotations?status=${value}`}
            className={[
              filterBase,
              filterStatus === value
                ? value === 'approved'
                  ? 'border-green-600 text-green-600'
                  : value === 'sent'
                  ? 'border-blue-600 text-blue-600'
                  : value === 'rejected'
                  ? 'border-red-600 text-red-600'
                  : 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {label} ({statusCounts[value] ?? 0})
          </Link>
        ))}
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor</TableHead>
              <TableHead>Klien</TableHead>
              <TableHead>Proyek</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal Dibuat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations?.length ? (
              quotations.map((q) => {
                const config = statusConfig[q.status] ?? { label: q.status, className: '' }
                return (
                  <TableRow key={q.id} className="relative cursor-pointer">
                    <TableCell className="font-medium font-mono">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="before:absolute before:inset-0"
                      >
                        {q.number}
                      </Link>
                    </TableCell>
                    <TableCell>{q.client_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {q.project_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(q.grand_total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={config.className}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  Belum ada quotation terdaftar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

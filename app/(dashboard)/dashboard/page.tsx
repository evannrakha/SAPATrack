import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Truck, Activity, FolderOpen, FileText } from 'lucide-react'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'border-transparent bg-secondary text-secondary-foreground',
  },
  sent: {
    label: 'Terkirim',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  approved: {
    label: 'Disetujui',
    className: 'border-green-200 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
  rejected: {
    label: 'Ditolak',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    { count: activeUnits },
    { count: idleUnits },
    { count: activeProjects },
    { count: monthlyQuotations },
    { data: recentQuotations },
  ] = await Promise.all([
    supabase
      .from('unit_current_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('unit_current_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'idle'),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString()),
    supabase
      .from('quotations')
      .select('number, status, created_at, clients(company_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const summaryCards = [
    {
      title: 'Unit Aktif',
      value: activeUnits ?? 0,
      icon: Truck,
      description: 'Sedang deployment',
    },
    {
      title: 'Unit Idle',
      value: idleUnits ?? 0,
      icon: Activity,
      description: 'Tersedia',
    },
    {
      title: 'Proyek Aktif',
      value: activeProjects ?? 0,
      icon: FolderOpen,
      description: 'Sedang berjalan',
    },
    {
      title: 'Quotation Bulan Ini',
      value: monthlyQuotations ?? 0,
      icon: FileText,
      description: new Date().toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      }),
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan operasional PT Sarana Asset Prioritas
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map(({ title, value, icon: Icon, description }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor</TableHead>
                <TableHead>Klien</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentQuotations?.length ? (
                recentQuotations.map((q) => {
                  const config = statusConfig[q.status] ?? {
                    label: q.status,
                    className: '',
                  }
                  const client = Array.isArray(q.clients)
                    ? q.clients[0]
                    : q.clients
                  return (
                    <TableRow key={q.number}>
                      <TableCell className="font-mono text-sm">
                        {q.number}
                      </TableCell>
                      <TableCell>{client?.company_name ?? '—'}</TableCell>
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
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Belum ada quotation
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

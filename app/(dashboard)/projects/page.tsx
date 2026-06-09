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
import type { Project } from '@/lib/types/projects'

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'border-transparent bg-secondary text-secondary-foreground',
  },
  active: {
    label: 'Aktif',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  completed: {
    label: 'Selesai',
    className: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
}

const filterStatuses = [
  { label: 'Aktif', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Selesai', value: 'completed' },
  { label: 'Dibatalkan', value: 'cancelled' },
]

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: allStatuses }, { data: projects }, { data: activeDeployments }] = await Promise.all([
    supabase.from('projects').select('status'),
    filterStatus
      ? supabase
          .from('projects')
          .select('id, name, location, status, start_date, client_id, created_at, clients(company_name)')
          .eq('status', filterStatus)
          .order('created_at', { ascending: false })
          .returns<Project[]>()
      : supabase
          .from('projects')
          .select('id, name, location, status, start_date, client_id, created_at, clients(company_name)')
          .order('created_at', { ascending: false })
          .returns<Project[]>(),
    supabase
      .from('deployments')
      .select('project_id')
      .is('end_date', null),
  ])

  const deploymentCounts = (activeDeployments ?? []).reduce<Record<string, number>>(
    (acc, d) => {
      const key = d.project_id as string
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    },
    {}
  )

  const statusCounts = (allStatuses ?? []).reduce<Record<string, number>>(
    (acc, p) => {
      const key = p.status as string
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    },
    {}
  )

  const filterBase =
    'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Daftar proyek PT Sarana Asset Prioritas
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="size-4" />
            Proyek Baru
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/projects"
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
            href={`/projects?status=${value}`}
            className={[
              filterBase,
              filterStatus === value
                ? value === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : value === 'completed'
                  ? 'border-green-600 text-green-600'
                  : value === 'cancelled'
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
              <TableHead>Nama Proyek</TableHead>
              <TableHead>Klien</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal Mulai</TableHead>
              <TableHead className="text-right">Unit Aktif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.length ? (
              projects.map((p) => {
                const config = statusConfig[p.status] ?? { label: p.status, className: '' }
                const client = Array.isArray(p.clients) ? p.clients[0] : p.clients
                return (
                  <TableRow key={p.id} className="relative cursor-pointer">
                    <TableCell className="font-medium">
                      <Link
                        href={`/projects/${p.id}`}
                        className="before:absolute before:inset-0"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client?.company_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.location ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={config.className}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.start_date
                        ? new Date(p.start_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {deploymentCounts[p.id] ?? 0}
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
                  Belum ada proyek terdaftar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

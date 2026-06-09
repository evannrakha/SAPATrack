import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { UnitStatus } from '@/lib/types/fleet'

const categoryLabel: Record<string, string> = {
  vehicle: 'Kendaraan',
  heavy_equipment: 'Alat Berat',
}

const statusBadge: Record<
  string,
  { label: string; className: string }
> = {
  idle: {
    label: 'Idle',
    className: 'border-border text-foreground',
  },
  active: {
    label: 'Aktif',
    className: 'border-transparent bg-secondary text-secondary-foreground',
  },
  maintenance: {
    label: 'Servis',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: allUnits }, { data: units }] = await Promise.all([
    supabase
      .from('unit_current_status')
      .select('status')
      .returns<Pick<UnitStatus, 'status'>[]>(),
    filterStatus
      ? supabase
          .from('unit_current_status')
          .select('*')
          .eq('status', filterStatus)
          .order('code')
          .returns<UnitStatus[]>()
      : supabase
          .from('unit_current_status')
          .select('*')
          .order('code')
          .returns<UnitStatus[]>(),
  ])

  const counts = {
    idle: allUnits?.filter((u) => u.status === 'idle').length ?? 0,
    active: allUnits?.filter((u) => u.status === 'active').length ?? 0,
    maintenance: allUnits?.filter((u) => u.status === 'maintenance').length ?? 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fleet Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Status real-time seluruh armada PT Sarana Asset Prioritas
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/fleet"
          className={
            !filterStatus
              ? 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border bg-muted text-foreground'
              : 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
          }
        >
          Semua ({allUnits?.length ?? 0})
        </Link>
        <Link
          href="/fleet?status=idle"
          className={
            filterStatus === 'idle'
              ? 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
              : 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
          }
        >
          {counts.idle} Idle
        </Link>
        <Link
          href="/fleet?status=active"
          className={
            filterStatus === 'active'
              ? 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
          }
        >
          {counts.active} Aktif
        </Link>
        <Link
          href="/fleet?status=maintenance"
          className={
            filterStatus === 'maintenance'
              ? 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
              : 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
          }
        >
          {counts.maintenance} Servis
        </Link>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Unit</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proyek Aktif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units?.length ? (
              units.map((unit) => {
                const badge = statusBadge[unit.status]
                return (
                  <TableRow key={unit.id} className="relative cursor-pointer">
                    <TableCell className="font-mono text-sm font-medium">
                      <Link
                        href={`/fleet/${unit.id}`}
                        className="before:absolute before:inset-0"
                      >
                        {unit.code}
                      </Link>
                    </TableCell>
                    <TableCell>{unit.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {categoryLabel[unit.category] ?? unit.category}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {unit.active_project_name ?? '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  Belum ada unit terdaftar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

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
  { label: string; variant: 'outline' | 'default' | 'destructive'; className?: string }
> = {
  idle: {
    label: 'Idle',
    variant: 'outline',
    className: 'text-green-600 border-green-600',
  },
  active: {
    label: 'Aktif',
    variant: 'default',
    className: 'bg-amber-500 hover:bg-amber-500 text-white border-transparent',
  },
  maintenance: {
    label: 'Servis',
    variant: 'destructive',
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
          className={[
            'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            !filterStatus
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          Semua ({allUnits?.length ?? 0})
        </Link>
        <Link
          href="/fleet?status=idle"
          className={[
            'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            filterStatus === 'idle'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {counts.idle} Idle
        </Link>
        <Link
          href="/fleet?status=active"
          className={[
            'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            filterStatus === 'active'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {counts.active} Aktif
        </Link>
        <Link
          href="/fleet?status=maintenance"
          className={[
            'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            filterStatus === 'maintenance'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
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
                      <Badge variant={badge.variant} className={badge.className}>{badge.label}</Badge>
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

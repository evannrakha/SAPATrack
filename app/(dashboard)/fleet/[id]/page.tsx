import Link from 'next/link'
import { notFound } from 'next/navigation'
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
import { ArrowLeft } from 'lucide-react'
import type { UnitStatus, DeploymentHistory } from '@/lib/types/fleet'

const categoryLabel: Record<string, string> = {
  vehicle: 'Kendaraan',
  heavy_equipment: 'Alat Berat',
}

function diffDays(start: string, end: string | null): number {
  const a = new Date(start)
  const b = end ? new Date(end) : new Date()
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000))
}

export default async function FleetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: unit }, { data: deployments }] = await Promise.all([
    supabase
      .from('unit_current_status')
      .select('id, code, name, category, status')
      .eq('id', id)
      .single()
      .returns<Pick<UnitStatus, 'id' | 'code' | 'name' | 'category' | 'status'>>(),
    supabase
      .from('deployments')
      .select('id, start_date, end_date, notes, projects(name, location)')
      .eq('unit_id', id)
      .order('start_date', { ascending: false })
      .returns<DeploymentHistory[]>(),
  ])

  if (!unit) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/fleet"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{unit.name}</h1>
        <p className="text-sm text-muted-foreground">
          {unit.code} &middot; {categoryLabel[unit.category] ?? unit.category}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-base font-medium">Histori Deployment</h2>
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyek</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Selesai</TableHead>
                <TableHead className="text-right">Durasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments?.length ? (
                deployments.map((d) => {
                  const project = Array.isArray(d.projects)
                    ? d.projects[0]
                    : d.projects
                  const days = diffDays(d.start_date, d.end_date)
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {project?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project?.location ?? '—'}
                      </TableCell>
                      <TableCell>
                        {new Date(d.start_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {d.end_date ? (
                          new Date(d.end_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <Badge className="border-transparent bg-secondary text-secondary-foreground">
                            Aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {days} hari{d.end_date ? '' : ' (berlangsung)'}
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
                    Belum ada histori deployment untuk unit ini
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

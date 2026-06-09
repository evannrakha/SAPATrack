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
import type { Project, ProjectActiveUnit } from '@/lib/types/projects'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'border-transparent bg-secondary text-secondary-foreground' },
  active: { label: 'Aktif', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  completed: { label: 'Selesai', className: 'border-green-200 bg-green-50 text-green-700' },
  cancelled: { label: 'Dibatalkan', className: 'border-destructive/20 bg-destructive/10 text-destructive' },
}

const categoryLabel: Record<string, string> = {
  vehicle: 'Kendaraan',
  heavy_equipment: 'Alat Berat',
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: project }, { data: activeUnits }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, location, status, start_date, end_date, description, client_id, created_at, clients(company_name)')
      .eq('id', id)
      .single()
      .returns<Project>(),
    supabase
      .from('deployments')
      .select('id, start_date, units(id, code, name, category)')
      .eq('project_id', id)
      .is('end_date', null)
      .order('start_date', { ascending: false })
      .returns<ProjectActiveUnit[]>(),
  ])

  if (!project) notFound()

  const client = Array.isArray(project.clients) ? project.clients[0] : project.clients
  const config = statusConfig[project.status] ?? { label: project.status, className: '' }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Projects
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{client?.company_name ?? '—'}</p>
        </div>
        <Badge className={config.className}>{config.label}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-xl border p-6 text-sm">
        <div className="space-y-1">
          <p className="text-muted-foreground">Lokasi</p>
          <p className="font-medium">{project.location ?? '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Tanggal Mulai</p>
          <p className="font-medium">
            {project.start_date
              ? new Date(project.start_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : '—'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Tanggal Selesai</p>
          <p className="font-medium">
            {project.end_date
              ? new Date(project.end_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : '—'}
          </p>
        </div>
        {project.description && (
          <div className="col-span-3 space-y-1 border-t pt-4">
            <p className="text-muted-foreground">Deskripsi</p>
            <p className="font-medium">{project.description}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-medium">
          Unit Aktif ({activeUnits?.length ?? 0})
        </h2>
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Unit</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Mulai Deployment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUnits?.length ? (
                activeUnits.map((d) => {
                  const unit = Array.isArray(d.units) ? d.units[0] : d.units
                  return (
                    <TableRow key={d.id} className="relative cursor-pointer">
                      <TableCell className="font-mono text-sm font-medium">
                        {unit ? (
                          <Link
                            href={`/fleet/${unit.id}`}
                            className="before:absolute before:inset-0"
                          >
                            {unit.code}
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{unit?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {unit ? (categoryLabel[unit.category] ?? unit.category) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(d.start_date).toLocaleDateString('id-ID', {
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
                    className="py-12 text-center text-muted-foreground"
                  >
                    Tidak ada unit aktif di proyek ini
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

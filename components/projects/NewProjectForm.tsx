'use client'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createProject } from '@/lib/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ClientOption } from '@/lib/types/projects'

interface NewProjectFormProps {
  clients: ClientOption[]
}

export function NewProjectForm({ clients }: NewProjectFormProps) {
  const [state, action, isPending] = useActionState(createProject, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.success) {
      toast.success('Proyek berhasil dibuat')
      router.push('/projects')
    }
  }, [state, router])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Projects
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Proyek Baru</h1>
        <p className="text-sm text-muted-foreground">Buat proyek baru untuk PT Sarana Asset Prioritas</p>
      </div>

      <form action={action} className="max-w-lg space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium leading-none">
            Nama Proyek <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            name="name"
            placeholder="Contoh: Proyek Jalan Tol Ciawi"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Klien <span className="text-destructive">*</span>
          </label>
          <Select name="client_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Pilih klien…" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-medium leading-none">
            Lokasi
          </label>
          <Input
            id="location"
            name="location"
            placeholder="Contoh: Ciawi, Bogor"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="start_date" className="text-sm font-medium leading-none">
            Tanggal Mulai
          </label>
          <Input id="start_date" name="start_date" type="date" />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium leading-none">
            Deskripsi
          </label>
          <Textarea
            id="description"
            name="description"
            placeholder="Deskripsi singkat proyek…"
            rows={3}
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Menyimpan…' : 'Buat Proyek'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/projects">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

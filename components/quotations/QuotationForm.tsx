'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { createQuotation } from '@/lib/actions/quotations'
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
import type {
  QuotationProjectOption,
  QuotationUnitOption,
  QuotationPricelistOption,
} from '@/lib/types/quotations'
import type { ClientOption } from '@/lib/types/projects'

interface ItemRow {
  key: string
  unitId: string
  pricelistId: string
  rateType: string
  rateSnapshot: number
  duration: string
}

interface QuotationFormProps {
  clients: ClientOption[]
  projects: QuotationProjectOption[]
  idleUnits: QuotationUnitOption[]
  pricelists: QuotationPricelistOption[]
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

function newRow(): ItemRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    unitId: '',
    pricelistId: '',
    rateType: '',
    rateSnapshot: 0,
    duration: '',
  }
}

export function QuotationForm({
  clients,
  projects,
  idleUnits,
  pricelists,
}: QuotationFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState<ItemRow[]>([newRow()])
  const [discountAmount, setDiscountAmount] = useState('0')
  const [taxPercentage] = useState('11')
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filteredProjects = projects.filter((p) => p.client_id === clientId)
  const selectedUnitIds = items.map((i) => i.unitId).filter(Boolean)

  const updateItem = (key: string, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
  }

  const handleUnitChange = (key: string, unitId: string) => {
    const unitPricelists = pricelists.filter((p) => p.unit_id === unitId)
    const first = unitPricelists[0]
    updateItem(key, {
      unitId,
      pricelistId: first?.id ?? '',
      rateType: first?.rate_type ?? '',
      rateSnapshot: first?.rate_amount ?? 0,
    })
  }

  const handlePricelistChange = (key: string, pricelistId: string) => {
    const pl = pricelists.find((p) => p.id === pricelistId)
    updateItem(key, {
      pricelistId,
      rateType: pl?.rate_type ?? '',
      rateSnapshot: pl?.rate_amount ?? 0,
    })
  }

  // Totals
  const subtotalItems = items.reduce((sum, item) => {
    const dur = parseFloat(item.duration) || 0
    return sum + dur * item.rateSnapshot
  }, 0)
  const discount = parseFloat(discountAmount) || 0
  const tax = parseFloat(taxPercentage) || 11
  const afterDiscount = subtotalItems - discount
  const taxAmount = afterDiscount * (tax / 100)
  const grandTotal = afterDiscount + taxAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!clientId) { setError('Pilih klien terlebih dahulu'); return }
    const validItems = items.filter((i) => i.unitId && i.pricelistId && parseFloat(i.duration) > 0)
    if (validItems.length === 0) { setError('Tambah minimal 1 unit dengan durasi yang valid'); return }

    startTransition(async () => {
      const result = await createQuotation({
        clientId,
        projectId: projectId || undefined,
        items: validItems.map((i) => ({
          unitId: i.unitId,
          pricelistId: i.pricelistId,
          rateType: i.rateType,
          rateSnapshot: i.rateSnapshot,
          duration: parseFloat(i.duration),
        })),
        discountAmount: discount,
        taxPercentage: tax,
        notes: notes || undefined,
        validUntil: validUntil || undefined,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.success && result.id) {
        toast.success('Quotation berhasil dibuat')
        router.push(`/quotations/${result.id}`)
      }
    })
  }

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

      <div>
        <h1 className="text-2xl font-semibold">Quotation Baru</h1>
        <p className="text-sm text-muted-foreground">Buat penawaran harga sewa alat berat</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Klien & Proyek */}
        <div className="rounded-xl border p-6 space-y-4">
          <h2 className="font-medium">Klien & Proyek</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Klien <span className="text-destructive">*</span>
              </label>
              <Select
                value={clientId}
                onValueChange={(v) => { setClientId(v); setProjectId('') }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih klien…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Proyek</label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
                disabled={!clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={clientId ? 'Pilih proyek…' : 'Pilih klien dulu'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Items */}
        <div className="rounded-xl border p-6 space-y-4">
          <h2 className="font-medium">Unit & Harga</h2>
          <div className="space-y-3">
            {items.map((item, idx) => {
              const unitPricelists = pricelists.filter((p) => p.unit_id === item.unitId)
              const availableUnits = idleUnits.filter(
                (u) => !selectedUnitIds.includes(u.id) || u.id === item.unitId
              )
              const dur = parseFloat(item.duration) || 0
              const subtotal = dur * item.rateSnapshot

              return (
                <div key={item.key} className="grid grid-cols-[1fr_1fr_120px_120px_32px] gap-2 items-end">
                  <div className="space-y-1.5">
                    {idx === 0 && <p className="text-xs text-muted-foreground font-medium">Unit (Idle)</p>}
                    <Select
                      value={item.unitId}
                      onValueChange={(v) => handleUnitChange(item.key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih unit…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.code} — {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    {idx === 0 && <p className="text-xs text-muted-foreground font-medium">Tarif</p>}
                    <Select
                      value={item.pricelistId}
                      onValueChange={(v) => handlePricelistChange(item.key, v)}
                      disabled={!item.unitId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tarif…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitPricelists.map((pl) => (
                          <SelectItem key={pl.id} value={pl.id}>
                            {fmt(pl.rate_amount)}{rateTypeLabel[pl.rate_type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    {idx === 0 && (
                      <p className="text-xs text-muted-foreground font-medium">
                        Durasi{item.rateType ? ` (${item.rateType === 'hourly' ? 'jam' : 'hari'})` : ''}
                      </p>
                    )}
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={item.duration}
                      onChange={(e) => updateItem(item.key, { duration: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    {idx === 0 && <p className="text-xs text-muted-foreground font-medium">Subtotal</p>}
                    <div className="flex h-9 items-center rounded-lg border bg-muted/30 px-3 text-sm text-muted-foreground">
                      {subtotal > 0 ? fmt(subtotal) : '—'}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, newRow()])}
          >
            <Plus className="size-4" />
            Tambah Unit
          </Button>
        </div>

        {/* Section 3: Ringkasan */}
        <div className="rounded-xl border p-6 space-y-4">
          <h2 className="font-medium">Ringkasan</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="discount" className="text-sm font-medium leading-none">
                  Diskon (Rp)
                </label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="1000"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="valid_until" className="text-sm font-medium leading-none">
                  Berlaku Hingga
                </label>
                <Input
                  id="valid_until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium leading-none">
                  Catatan
                </label>
                <Textarea
                  id="notes"
                  placeholder="Catatan tambahan untuk quotation ini…"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-muted/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(subtotalItems)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-destructive">- {fmt(discount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Setelah Diskon</span>
                <span>{fmt(afterDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PPN {taxPercentage}%</span>
                <span>{fmt(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Grand Total</span>
                <span>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Menyimpan…' : 'Buat Quotation'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/quotations">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

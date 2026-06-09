'use server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { CreateQuotationInput, QuotationActionState } from '@/lib/types/quotations'

function getClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createQuotation(
  input: CreateQuotationInput
): Promise<QuotationActionState> {
  const supabase = getClient()

  const { data: number, error: rpcError } = await supabase.rpc('generate_quotation_number')
  if (rpcError) return { error: rpcError.message }

  const { data: quotation, error: qError } = await supabase
    .from('quotations')
    .insert({
      number,
      client_id: input.clientId,
      project_id: input.projectId || null,
      status: 'draft',
      discount_amount: input.discountAmount,
      tax_percentage: input.taxPercentage,
      notes: input.notes || null,
      valid_until: input.validUntil || null,
    })
    .select('id')
    .single()

  if (qError) return { error: qError.message }

  const { error: itemsError } = await supabase.from('quotation_items').insert(
    input.items.map((item) => ({
      quotation_id: quotation.id,
      unit_id: item.unitId,
      pricelist_id: item.pricelistId,
      duration: item.duration,
      rate_snapshot: item.rateSnapshot,
      rate_type: item.rateType,
      subtotal: item.duration * item.rateSnapshot,
    }))
  )

  if (itemsError) return { error: itemsError.message }

  revalidatePath('/quotations')
  return { success: true, id: quotation.id }
}

// Gunakan dengan .bind(null, quotationId) di useActionState
export async function approveQuotation(
  quotationId: string,
  _prev: QuotationActionState,
  _formData: FormData
): Promise<QuotationActionState> {
  const supabase = getClient()

  // Baca status awal untuk revert jika gagal
  const { data: current } = await supabase
    .from('quotations')
    .select('status, project_id')
    .eq('id', quotationId)
    .single()

  if (!current) return { error: 'Quotation tidak ditemukan' }
  if (current.status === 'approved') return { error: 'Quotation sudah diapprove' }
  if (!current.project_id) return { error: 'Proyek belum ditentukan — hubungkan ke proyek sebelum approve' }

  // 1. UPDATE status approved
  const { error: updateError } = await supabase
    .from('quotations')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', quotationId)

  if (updateError) return { error: updateError.message }

  // 2. Ambil semua unit_id dari quotation_items
  const { data: items } = await supabase
    .from('quotation_items')
    .select('unit_id')
    .eq('quotation_id', quotationId)

  const unitIds = items?.map((i) => i.unit_id as string) ?? []

  // 3. Validasi double-deploy
  if (unitIds.length > 0) {
    const { data: conflicts } = await supabase
      .from('deployments')
      .select('unit_id, units(code)')
      .in('unit_id', unitIds)
      .is('end_date', null)

    if (conflicts && conflicts.length > 0) {
      await supabase
        .from('quotations')
        .update({ status: current.status, approved_at: null })
        .eq('id', quotationId)

      const codes = conflicts
        .map((c) => {
          const unit = Array.isArray(c.units) ? c.units[0] : c.units
          return (unit as { code: string } | null)?.code ?? c.unit_id
        })
        .join(', ')
      return { error: `Unit berikut sudah aktif di deployment lain: ${codes}` }
    }
  }

  // 4. INSERT deployments untuk setiap unit
  if (unitIds.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const { error: deployError } = await supabase.from('deployments').insert(
      unitIds.map((unitId) => ({
        unit_id: unitId,
        project_id: current.project_id,
        start_date: today,
      }))
    )

    if (deployError) {
      await supabase
        .from('quotations')
        .update({ status: current.status, approved_at: null })
        .eq('id', quotationId)
      return { error: deployError.message }
    }
  }

  revalidatePath('/fleet')
  revalidatePath('/quotations')
  revalidatePath(`/quotations/${quotationId}`)
  return { success: true }
}

export async function rejectQuotation(
  quotationId: string,
  _prev: QuotationActionState,
  _formData: FormData
): Promise<QuotationActionState> {
  const supabase = getClient()

  const { error } = await supabase
    .from('quotations')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .eq('id', quotationId)

  if (error) return { error: error.message }

  revalidatePath('/quotations')
  revalidatePath(`/quotations/${quotationId}`)
  return { success: true }
}

export async function sendQuotation(
  quotationId: string,
  _prev: QuotationActionState,
  _formData: FormData
): Promise<QuotationActionState> {
  const supabase = getClient()

  const { error } = await supabase
    .from('quotations')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', quotationId)

  if (error) return { error: error.message }

  revalidatePath('/quotations')
  revalidatePath(`/quotations/${quotationId}`)
  return { success: true }
}

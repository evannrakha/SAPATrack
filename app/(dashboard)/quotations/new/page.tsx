import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { QuotationForm } from '@/components/quotations/QuotationForm'
import type { ClientOption } from '@/lib/types/projects'
import type {
  QuotationProjectOption,
  QuotationUnitOption,
  QuotationPricelistOption,
} from '@/lib/types/quotations'

export default async function NewQuotationPage() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: clients },
    { data: projects },
    { data: idleUnits },
    { data: pricelists },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, company_name')
      .eq('is_active', true)
      .order('company_name')
      .returns<ClientOption[]>(),
    supabase
      .from('projects')
      .select('id, name, client_id')
      .in('status', ['draft', 'active'])
      .order('name')
      .returns<QuotationProjectOption[]>(),
    supabase
      .from('unit_current_status')
      .select('id, code, name, category')
      .eq('status', 'idle')
      .order('code')
      .returns<QuotationUnitOption[]>(),
    supabase
      .from('pricelist')
      .select('id, unit_id, rate_type, rate_amount')
      .eq('is_active', true)
      .returns<QuotationPricelistOption[]>(),
  ])

  return (
    <QuotationForm
      clients={clients ?? []}
      projects={projects ?? []}
      idleUnits={idleUnits ?? []}
      pricelists={pricelists ?? []}
    />
  )
}

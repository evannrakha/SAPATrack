import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NewProjectForm } from '@/components/projects/NewProjectForm'
import type { ClientOption } from '@/lib/types/projects'

export default async function NewProjectPage() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('is_active', true)
    .order('company_name')
    .returns<ClientOption[]>()

  return <NewProjectForm clients={clients ?? []} />
}

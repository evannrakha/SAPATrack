'use server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export type ProjectActionState = { error?: string; success?: boolean } | null

export async function createProject(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const name = formData.get('name') as string
  const client_id = formData.get('client_id') as string
  const location = (formData.get('location') as string) || null
  const start_date = (formData.get('start_date') as string) || null
  const description = (formData.get('description') as string) || null

  if (!name?.trim()) return { error: 'Nama proyek wajib diisi' }
  if (!client_id) return { error: 'Klien wajib dipilih' }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('projects').insert({
    name: name.trim(),
    client_id,
    location: location?.trim() || null,
    start_date: start_date || null,
    description: description?.trim() || null,
    status: 'active',
  })

  if (error) return { error: error.message }

  revalidatePath('/projects')
  return { success: true }
}

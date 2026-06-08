# SAPATrack — SAP Fleet & Quotation Management System
Sistem manajemen armada dan quotation sewa alat berat untuk PT Sarana Asset Prioritas (PT SAP),
Cimareme, Bandung Barat. Dibangun oleh mahasiswa magang, diserahkan ke PT SAP saat handover.

@PROGRESS.md

---

## Tech Stack (Aktual)
- **Framework**: Next.js 16.2.7 (App Router) — BUKAN Pages Router
- **Styling**: Tailwind CSS v3 + shadcn/ui (preset Nova, Radix)
- **Icons**: Lucide React (sudah include di preset Nova)
- **Font**: Geist (sudah include di preset Nova)
- **Database**: Supabase (PostgreSQL) — semua query dari server
- **Auth**: Supabase Auth + proxy.ts (Next.js 16 — BUKAN middleware.ts)
- **Business Logic**: Next.js Server Actions (`"use server"`)
- **Notifications**: Sonner (toast)
- **Deploy**: Vercel via GitHub CI/CD

---

## Struktur Folder (Aktual)
```
app/
  (auth)/login/           → halaman login, tanpa sidebar layout
  (dashboard)/            → semua halaman authenticated, pakai sidebar
    dashboard/page.tsx
    fleet/page.tsx + [id]/page.tsx
    projects/page.tsx + new/page.tsx + [id]/page.tsx
    quotations/page.tsx + new/page.tsx + [id]/page.tsx
    admin/units/ + pricelist/ + clients/ + users/
components/
  ui/          → shadcn/ui atom components (sudah ada: button)
  fleet/       → komponen Fleet Tracker
  quotation/   → komponen Quotation
  layout/      → Sidebar, Navbar
lib/
  supabase/
    server.ts  → createClient() — ANON_KEY + cookies, untuk Server Components
    admin.ts   → createAdminClient() — SERVICE_ROLE_KEY, untuk Server Actions
    browser.ts → createClient() — ANON_KEY, untuk Client Components
  actions/     → Server Actions per modul
  types/       → TypeScript interfaces
  utils.ts     → sudah ada dari scaffold (cn helper)
proxy.ts       → auth protection (Next.js 16 — nama fungsi harus "proxy")
schema.sql     → DDL lengkap — sumber kebenaran struktur database
```

---

## Database — 8 Tabel, 2 View, 2 Function

### Tabel Master Data
| Tabel | Field Kunci | Catatan |
|---|---|---|
| `clients` | company_name, pic_name, npwp | is_active = soft delete |
| `units` | code (UNIQUE), category, subcategory | is_active + is_maintenance |
| `pricelist` | unit_id, rate_type, rate_amount | histori disimpan, is_active = false jika lama |

### Tabel Transaksi
| Tabel | Field Kunci | Catatan |
|---|---|---|
| `projects` | client_id, status | status: draft/active/completed/cancelled |
| `deployments` | unit_id, project_id, start_date, end_date | end_date NULL = masih aktif |
| `quotations` | number (QUO-YYYY-XXXX), client_id, project_id | status: draft/sent/approved/rejected |
| `quotation_items` | quotation_id, unit_id, rate_snapshot, subtotal | UNIQUE(quotation_id, unit_id) |
| `profiles` | FK → auth.users(id), role | role: admin/staff/viewer |

### Views — gunakan ini, jangan buat query duplikat
- `unit_current_status` → status real-time tiap unit untuk Fleet Tracker
- `quotation_totals` → subtotal, diskon, PPN, grand_total per quotation

### Functions
- `generate_quotation_number()` → panggil dari Server Action saat buat quotation
- `update_updated_at()` → trigger otomatis, tidak perlu dipanggil manual

---

## Aturan Bisnis Kritis — JANGAN DILANGGAR

### 1. Status unit tidak pernah disimpan sebagai field
Status dihitung dari `deployments`:
- `is_maintenance = TRUE` → **maintenance** (override semua)
- Ada deployment dengan `end_date IS NULL` → **active**
- Tidak ada keduanya → **idle**
Selalu gunakan view `unit_current_status`.

### 2. Approve quotation → deployment otomatis
Saat `approveQuotation(id)` dipanggil di Server Action:
1. UPDATE quotations SET status='approved', approved_at=NOW()
2. SELECT semua unit_id dari quotation_items WHERE quotation_id = id
3. INSERT ke deployments untuk setiap unit
4. revalidatePath('/fleet') + revalidatePath('/quotations')

### 3. Validasi double-deploy
Sebelum INSERT ke deployments, cek unit tidak punya deployment aktif lain (end_date IS NULL).

### 4. rate_snapshot tidak boleh berubah
Nilai rate_snapshot di quotation_items adalah snapshot saat quotation dibuat.
Jangan query ulang dari pricelist untuk tampilan — gunakan rate_snapshot.

---

## Konvensi Kode

### Tiga Supabase Client — pilih yang tepat
```typescript
// Server Components (baca data) — gunakan ini
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Server Actions (mutasi data, bypass RLS) — gunakan ini
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()

// Client Components (cek auth state saja) — gunakan ini
import { createClient } from '@/lib/supabase/browser'
const supabase = createClient()
```

### Server Actions — pola wajib
```typescript
'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function namaAction(param: string) {
  const supabase = createAdminClient()
  // ... logic
  revalidatePath('/halaman-terkait')
}
```

### Soft delete — tidak ada hard delete
- units, clients, pricelist → set `is_active = false`
- quotation_items → boleh DELETE (CASCADE dari quotations)

### Format currency Rupiah
```typescript
new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
// Output: Rp 985.000.000
```

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL        # browser + server — base URL project
NEXT_PUBLIC_SUPABASE_ANON_KEY   # browser + server — Publishable key (sb_publishable_...)
SUPABASE_SERVICE_ROLE_KEY       # SERVER ONLY — Secret key (sb_secret_...)
```
SERVICE_ROLE_KEY tidak boleh pernah ada di browser bundle.

---

## Role & Akses
| Role | Akses |
|---|---|
| `admin` | semua halaman termasuk /admin/* |
| `staff` | semua kecuali /admin/* |
| `viewer` | hanya baca — dashboard, fleet, quotations, projects |

Role dibaca dari tabel `profiles`, bukan dari Supabase Auth metadata.
proxy.ts menangani redirect berdasarkan role.

---

## Catatan Next.js 16
- File proxy: `proxy.ts` (bukan `middleware.ts`)
- Nama fungsi ekspor: `proxy` (bukan `middleware`)
- Versi aktual: 16.2.7 (tidak ada perbedaan signifikan dengan 14 untuk use case ini)
- Turbopack aktif secara default di `next dev`

---

## Tidak Masuk Scope Fase Ini
- Export PDF quotation (fase 2 — @react-pdf/renderer)
- Notifikasi email atau WhatsApp
- Export Excel / laporan bulanan
- Docker, mobile optimization, integrasi ERP

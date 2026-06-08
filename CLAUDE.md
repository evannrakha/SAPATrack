# Sarana360 — SAP Fleet & Quotation Management System
Sistem manajemen armada dan quotation sewa alat berat untuk PT Sarana Asset Prioritas (PT SAP),
Cimareme, Bandung Barat. Dibangun oleh mahasiswa magang, diserahkan ke PT SAP saat handover.

---

## Tech Stack
- **Framework**: Next.js versi actual: 16.2.7 (bukan 14 seperti rencana awal)
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **Database**: Supabase (PostgreSQL) — storage only, semua query dari server
- **Auth**: Supabase Auth + Next.js Middleware
- **Business Logic**: Next.js Server Actions (`"use server"`) — pengganti Express/API routes
- **Deploy**: Vercel (free tier) via GitHub CI/CD

---

## Struktur Folder
```
app/
  (auth)/login/           → halaman login, tanpa sidebar layout
  (dashboard)/            → semua halaman authenticated, pakai sidebar layout
    dashboard/page.tsx
    fleet/page.tsx + [id]/page.tsx
    projects/page.tsx + new/page.tsx + [id]/page.tsx
    quotations/page.tsx + new/page.tsx + [id]/page.tsx
    admin/units/ + pricelist/ + clients/ + users/
components/
  ui/          → shadcn/ui atom components
  fleet/       → komponen khusus Fleet Tracker
  quotation/   → komponen khusus Quotation
  layout/      → Sidebar, Navbar
lib/
  supabase/    → server.ts (service role) + browser.ts (anon key)
  actions/     → Server Actions per modul (fleet.ts, quotations.ts, dst.)
  types/       → TypeScript interfaces
  utils/       → formatCurrency, formatDate, dll.
proxy.ts       → auth protection, role check untuk /admin/*
schema.sql     → DDL lengkap — sumber kebenaran struktur database
seed.sql       → data awal 39 unit + pricelist + klien contoh (belum dibuat)
```

---

## Database — 8 Tabel, 2 View, 2 Function

### Tabel Master Data
| Tabel | Kunci | Catatan |
|---|---|---|
| `clients` | company_name, pic_name, npwp | is_active = soft delete |
| `units` | code (UNIQUE), category, subcategory | is_active + is_maintenance |
| `pricelist` | unit_id, rate_type, rate_amount | histori disimpan, is_active = false jika lama |

### Tabel Transaksi
| Tabel | Kunci | Catatan |
|---|---|---|
| `projects` | client_id, status | status: draft/active/completed/cancelled |
| `deployments` | unit_id, project_id, start_date, end_date | end_date NULL = masih aktif |
| `quotations` | number (QUO-YYYY-XXXX), client_id, project_id | status: draft/sent/approved/rejected |
| `quotation_items` | quotation_id, unit_id, rate_snapshot, subtotal | UNIQUE(quotation_id, unit_id) |
| `profiles` | FK → auth.users(id), role | role: admin/staff/viewer |

### Views (jangan diganti jadi query manual)
- `unit_current_status` → status real-time tiap unit, dipakai Fleet Tracker
- `quotation_totals` → subtotal, diskon, PPN, grand_total per quotation

### Functions
- `generate_quotation_number()` → panggil dari Server Action, bukan dari client
- `update_updated_at()` → trigger otomatis, tidak perlu dipanggil manual

---

## Aturan Bisnis Kritis — JANGAN DILANGGAR

### 1. Status unit tidak pernah disimpan sebagai field
Status dihitung dari `deployments`:
- `is_maintenance = TRUE` → **maintenance** (override semua)
- Ada deployment dengan `end_date IS NULL` → **active**
- Tidak ada keduanya → **idle**
Selalu gunakan view `unit_current_status`, jangan buat query duplikat.

### 2. Approve quotation → deployment otomatis
Saat `approveQuotation(id)` dipanggil:
1. UPDATE quotations SET status='approved', approved_at=NOW()
2. SELECT semua unit_id dari quotation_items WHERE quotation_id = id
3. INSERT ke deployments untuk setiap unit (unit_id, project_id, start_date=today)
4. revalidatePath('/fleet') + revalidatePath('/quotations')
Tidak boleh ada langkah yang dipisah atau dijadikan SQL trigger.

### 3. Validasi sebelum deploy unit
Sebelum INSERT ke deployments, cek: unit tidak punya deployment aktif lain
(end_date IS NULL untuk unit yang sama). Tolak jika sudah ada.

### 4. rate_snapshot wajib di-snapshot saat quotation dibuat
Jangan query rate_amount dari pricelist saat tampil — gunakan rate_snapshot di quotation_items.
Nilai ini tidak boleh berubah meski pricelist diupdate kemudian.

---

## Konvensi Kode

### Supabase Client — dua client, dua tujuan
```typescript
// Server Components & Server Actions — gunakan ini
import { createServerClient } from '@/lib/supabase/server'
// Menggunakan SUPABASE_SERVICE_ROLE_KEY — tidak pernah ke browser

// Client Components — hanya untuk cek auth state
import { createBrowserClient } from '@/lib/supabase/browser'
// Menggunakan NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Server Actions — pola wajib
```typescript
// lib/actions/[modul].ts
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function namaAction(param: string) {
  const supabase = createServerClient()
  // ... logic
  revalidatePath('/halaman-terkait')
}
```

### Soft delete — tidak ada hard delete
- units, clients, pricelist → set `is_active = false`
- quotation_items → boleh DELETE (CASCADE dari quotations)
- Tidak ada `.delete()` Supabase untuk tabel lain kecuali quotation_items

### Format currency
Selalu gunakan `lib/utils/formatCurrency.ts` untuk tampilkan Rupiah.
Format: `Rp 985.000.000` (titik sebagai pemisah ribuan, tanpa desimal).

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL        # browser + server
NEXT_PUBLIC_SUPABASE_ANON_KEY   # browser + server
SUPABASE_SERVICE_ROLE_KEY       # SERVER ONLY — jangan prefix NEXT_PUBLIC_
```
SUPABASE_SERVICE_ROLE_KEY tidak boleh pernah ada di browser bundle.
Jika ragu, jalankan `grep -r "SERVICE_ROLE" .next/` setelah build.

---

## Role & Akses
| Role | Akses |
|---|---|
| `admin` | semua halaman termasuk /admin/* |
| `staff` | semua kecuali /admin/* |
| `viewer` | hanya baca — dashboard, fleet, quotations, projects |

Role dibaca dari tabel `profiles`, bukan dari Supabase Auth metadata.
Middleware di `middleware.ts` yang handle redirect berdasarkan role.

---

## Status Proyek Saat Ini
**Selesai:**
- SRS v1.0, SDD v1.0, Tech Stack Document v1.0
- schema.sql (8 tabel, 2 view, 2 function, RLS, index) — sudah divalidasi PostgreSQL
- Repo GitHub: SAPATrack (evannrakha)

**Belum dimulai:**
- create-next-app scaffold
- seed.sql
- Semua halaman dan komponen

**Urutan implementasi (3 minggu):**
- Minggu 1: scaffold + Supabase setup + middleware auth + Login + Dashboard + Fleet Tracker
- Minggu 2: Projects + Quotation + approveQuotation Server Action
- Minggu 3: Admin CRUD + polish + deploy Vercel + README + handover package

---

## Tidak Masuk Scope (Jangan Diimplementasi)
- Export PDF quotation (fase 2 — library: @react-pdf/renderer)
- Notifikasi email atau WhatsApp
- Export Excel / laporan bulanan
- Docker
- Mobile-first optimization
- Integrasi ERP atau software akuntansi

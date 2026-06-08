# Progress & Status Proyek

## Status Keseluruhan
**Fase**: Setup selesai — siap mulai coding fitur
**Minggu magang tersisa**: ~3 minggu
**Terakhir diupdate**: Juni 2026

---

## Sudah Selesai

### Setup & Infrastruktur
- [x] Repo GitHub: SAPATrack (evannrakha) — 4 commits
- [x] Supabase project: SAPATrack — region ap-southeast-2 (Sydney)
- [x] Database: 8 tabel, 2 view, 2 function, RLS aktif semua tabel
- [x] Next.js 16.2.7 scaffold — shadcn/ui Nova preset + Radix
- [x] Dependencies: @supabase/supabase-js, @supabase/ssr, sonner
- [x] Komponen shadcn/ui: button, badge, table, dialog, select, input, card, tabs
- [x] .env.local terkonfigurasi (3 variable Supabase)
- [x] Struktur folder: lib/supabase/, lib/actions/, lib/types/, components/fleet/, components/quotation/, components/layout/
- [x] lib/supabase/server.ts — createClient() dengan cookies
- [x] lib/supabase/admin.ts — createAdminClient() dengan SERVICE_ROLE_KEY
- [x] lib/supabase/browser.ts — createClient() browser
- [x] proxy.ts — auth protection berfungsi (redirect ke /login terbukti)

### Dokumen
- [x] SRS v1.0 (16 functional requirements)
- [x] SDD v1.0 (arsitektur, DB design, component patterns)
- [x] Tech Stack Document v1.0
- [x] schema.sql (validated di PostgreSQL lokal)
- [x] CLAUDE.md (konteks proyek untuk Claude Code)

---

## Belum Dimulai — Urutan Pengerjaan

### Minggu 1 (Prioritas sekarang)
- [ ] `app/(auth)/login/page.tsx` — halaman login email+password
- [ ] `app/(dashboard)/layout.tsx` — sidebar layout untuk semua halaman authenticated
- [ ] `app/(dashboard)/dashboard/page.tsx` — ringkasan eksekutif
- [ ] `app/(dashboard)/fleet/page.tsx` — daftar unit + status real-time
- [ ] `app/(dashboard)/fleet/[id]/page.tsx` — histori deployment per unit

### Minggu 2
- [ ] `app/(dashboard)/projects/` — list, new, detail
- [ ] `app/(dashboard)/quotations/page.tsx` — daftar quotation
- [ ] `app/(dashboard)/quotations/new/page.tsx` — kalkulator sewa
- [ ] `app/(dashboard)/quotations/[id]/page.tsx` — detail + approve
- [ ] `lib/actions/quotations.ts` — approveQuotation() Server Action (KRITIS)

### Minggu 3
- [ ] `app/(dashboard)/admin/units/page.tsx` — CRUD unit
- [ ] `app/(dashboard)/admin/pricelist/page.tsx` — CRUD pricelist
- [ ] `app/(dashboard)/admin/clients/page.tsx` — CRUD klien
- [ ] `app/(dashboard)/admin/users/page.tsx` — CRUD user + role
- [ ] seed.sql — data awal 39 unit + pricelist + klien contoh
- [ ] Deploy ke Vercel
- [ ] README.md lengkap untuk handover
- [ ] Dokumen backlog fitur yang belum selesai

---

## Keputusan Teknis yang Sudah Final

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 App Router | Server Actions, tidak butuh Express |
| Auth proxy | proxy.ts (Next.js 16) | Bukan middleware.ts — berubah di v16 |
| Supabase client | 3 file terpisah | server/admin/browser punya tujuan berbeda |
| Status unit | Computed dari deployments | Tidak disimpan sebagai field statis |
| Business logic | Server Actions | Bukan SQL triggers — lebih mudah debug |
| Component library | shadcn/ui Nova preset | Lucide icons + Geist font |
| Soft delete | is_active = false | Semua tabel kecuali quotation_items |

---

## Hal yang Perlu Dikonfirmasi ke PT SAP (Belum)
- [ ] Apakah pricelist excavator (Rp 155.000–1.750.000/jam) harga jual ke klien atau beli dari subkontraktor?
- [ ] Pembagian 24 unit Hino antara proyek Wiratama vs Adhi Karya?
- [ ] Siapa PIC yang menerima handover?
- [ ] Apakah PT SAP punya preferensi tampilan / warna brand?

---

## Catatan Penting
- Supabase region: ap-southeast-2 Sydney (saat handover PT SAP sebaiknya pilih ap-southeast-1 Singapore)
- Next.js versi aktual 16.2.7 — lebih baru dari rencana awal (14), tapi tidak ada breaking change signifikan
- `package.json` name: "sapatrack" (lowercase — aturan npm), folder tetap SAPATrack
- GitHub username: evannrakha

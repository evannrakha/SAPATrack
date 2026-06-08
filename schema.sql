-- ============================================================
-- SAP Fleet & Quotation Management System
-- Database Schema v1.0
-- PT Sarana Asset Prioritas
-- ============================================================
-- Jalankan file ini di Supabase SQL Editor secara berurutan.
-- Aman untuk dijalankan ulang (menggunakan IF NOT EXISTS).
-- ============================================================


-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- MASTER DATA TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 1. CLIENTS
-- Harus dibuat sebelum projects dan quotations (FK dependency)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name    TEXT NOT NULL,
    pic_name        TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    npwp            TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  clients              IS 'Database perusahaan klien PT SAP';
COMMENT ON COLUMN clients.company_name IS 'Nama resmi perusahaan klien';
COMMENT ON COLUMN clients.pic_name     IS 'Person In Charge — kontak utama di klien';
COMMENT ON COLUMN clients.npwp         IS 'Nomor NPWP untuk keperluan invoice';
COMMENT ON COLUMN clients.is_active    IS 'FALSE = diarsipkan, tidak muncul di dropdown form';


-- ------------------------------------------------------------
-- 2. UNITS
-- Armada kendaraan dan alat berat PT SAP
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('vehicle', 'heavy_equipment')),
    subcategory     TEXT,
    year            INTEGER CHECK (year BETWEEN 1990 AND 2100),
    plate_or_serial TEXT,
    description     TEXT,
    purchase_price  NUMERIC(15,2),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_maintenance  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  units                IS 'Master data armada kendaraan dan alat berat';
COMMENT ON COLUMN units.code           IS 'Kode unik internal, contoh: DT-001, EX-001, DZ-001';
COMMENT ON COLUMN units.category       IS 'vehicle = kendaraan biasa, heavy_equipment = alat berat';
COMMENT ON COLUMN units.subcategory    IS 'Contoh: dump_truck, excavator, dozer, sedan, mpv, suv';
COMMENT ON COLUMN units.is_active      IS 'FALSE = soft delete, tidak muncul di Fleet Tracker';
COMMENT ON COLUMN units.is_maintenance IS 'TRUE = override status jadi Servis, tidak bisa di-deploy';
COMMENT ON COLUMN units.purchase_price IS 'Harga beli unit, digunakan untuk referensi nilai aset';


-- ------------------------------------------------------------
-- 3. PRICELIST
-- Tarif sewa per unit — histori disimpan, tidak dihapus
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricelist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    rate_type       TEXT NOT NULL CHECK (rate_type IN ('hourly', 'daily')),
    rate_amount     NUMERIC(15,2) NOT NULL CHECK (rate_amount > 0),
    effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  pricelist                IS 'Tarif sewa per unit — histori dipertahankan';
COMMENT ON COLUMN pricelist.rate_type      IS 'hourly = per jam, daily = per hari';
COMMENT ON COLUMN pricelist.rate_amount    IS 'Nilai tarif dalam Rupiah';
COMMENT ON COLUMN pricelist.effective_date IS 'Tarif berlaku mulai tanggal ini';
COMMENT ON COLUMN pricelist.is_active      IS 'Hanya tarif aktif yang muncul di form quotation baru';
COMMENT ON COLUMN pricelist.notes          IS 'Catatan: misal harga khusus proyek tertentu';


-- ============================================================
-- TRANSACTION TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 4. PROJECTS
-- Setiap proyek terikat ke satu klien
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    name            TEXT NOT NULL,
    location        TEXT,
    start_date      DATE,
    end_date        DATE,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validasi: end_date tidak boleh sebelum start_date
    CONSTRAINT projects_dates_check CHECK (
        end_date IS NULL OR start_date IS NULL OR end_date >= start_date
    )
);

COMMENT ON TABLE  projects             IS 'Proyek PT SAP — satu proyek per entri';
COMMENT ON COLUMN projects.client_id   IS 'Klien pemberi proyek';
COMMENT ON COLUMN projects.status      IS 'draft=belum mulai, active=berjalan, completed=selesai, cancelled=dibatalkan';
COMMENT ON COLUMN projects.end_date    IS 'NULL berarti proyek masih berjalan (open-ended)';


-- ------------------------------------------------------------
-- 5. DEPLOYMENTS
-- Penugasan unit ke proyek — sumber kebenaran status armada
-- KRITIS: Status unit di Fleet Tracker dihitung dari tabel ini
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deployments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validasi: end_date tidak boleh sebelum start_date
    CONSTRAINT deployments_dates_check CHECK (
        end_date IS NULL OR end_date >= start_date
    )
);

COMMENT ON TABLE  deployments              IS 'Penugasan unit ke proyek — sumber kebenaran status Fleet Tracker';
COMMENT ON COLUMN deployments.unit_id      IS 'Unit yang di-deploy';
COMMENT ON COLUMN deployments.project_id   IS 'Proyek tujuan unit';
COMMENT ON COLUMN deployments.start_date   IS 'Tanggal unit mulai digunakan di proyek';
COMMENT ON COLUMN deployments.end_date     IS 'NULL = unit masih aktif di proyek ini (status = Aktif)';


-- ------------------------------------------------------------
-- 6. QUOTATIONS
-- Penawaran harga ke klien — terhubung ke client + project
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number              TEXT NOT NULL UNIQUE,
    client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
    discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_percentage      NUMERIC(5,2) NOT NULL DEFAULT 11 CHECK (tax_percentage >= 0),
    notes               TEXT,
    valid_until         DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at         TIMESTAMPTZ,
    rejected_at         TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ
);

COMMENT ON TABLE  quotations                  IS 'Penawaran harga ke klien';
COMMENT ON COLUMN quotations.number           IS 'Format: QUO-YYYY-XXXX, di-generate otomatis';
COMMENT ON COLUMN quotations.project_id       IS 'Boleh NULL jika quotation dibuat sebelum proyek dibuat';
COMMENT ON COLUMN quotations.status           IS 'draft→sent→approved/rejected';
COMMENT ON COLUMN quotations.discount_amount  IS 'Diskon nominal dalam Rupiah';
COMMENT ON COLUMN quotations.tax_percentage   IS 'PPN dalam persen, default 11';
COMMENT ON COLUMN quotations.approved_at      IS 'Timestamp saat status berubah jadi approved — trigger deployment otomatis';


-- ------------------------------------------------------------
-- 7. QUOTATION_ITEMS
-- Detail item per quotation — satu baris per unit
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotation_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id    UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    pricelist_id    UUID REFERENCES pricelist(id) ON DELETE SET NULL,
    duration        NUMERIC(10,2) NOT NULL CHECK (duration > 0),
    rate_snapshot   NUMERIC(15,2) NOT NULL CHECK (rate_snapshot > 0),
    rate_type       TEXT NOT NULL CHECK (rate_type IN ('hourly', 'daily')),
    subtotal        NUMERIC(15,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Satu unit hanya boleh muncul sekali per quotation
    CONSTRAINT quotation_items_unique_unit UNIQUE (quotation_id, unit_id)
);

COMMENT ON TABLE  quotation_items                IS 'Detail item per quotation — satu baris per unit yang ditawarkan';
COMMENT ON COLUMN quotation_items.pricelist_id   IS 'Referensi ke pricelist yang dipakai — boleh NULL jika pricelist dihapus';
COMMENT ON COLUMN quotation_items.duration       IS 'Durasi sewa dalam jam (hourly) atau hari (daily)';
COMMENT ON COLUMN quotation_items.rate_snapshot  IS 'SNAPSHOT harga saat quotation dibuat — tidak berubah jika pricelist diupdate kemudian';
COMMENT ON COLUMN quotation_items.rate_type      IS 'Disalin dari pricelist saat snapshot, untuk referensi tampilan';
COMMENT ON COLUMN quotation_items.subtotal       IS 'Computed: duration × rate_snapshot — disimpan untuk konsistensi historis';


-- ============================================================
-- USERS / AUTH
-- Note: Supabase Auth mengelola tabel auth.users secara internal.
-- Tabel profiles ini hanya menyimpan data tambahan (role, display name).
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'staff'
                    CHECK (role IN ('admin', 'staff', 'viewer')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  profiles           IS 'Profil tambahan untuk user Supabase Auth — menyimpan role dan nama';
COMMENT ON COLUMN profiles.id        IS 'Sama dengan auth.users.id — one-to-one relationship';
COMMENT ON COLUMN profiles.role      IS 'admin=akses penuh, staff=operasional, viewer=baca saja';
COMMENT ON COLUMN profiles.is_active IS 'FALSE = akun dinonaktifkan, tidak bisa login (perlu blokir di Supabase Auth dashboard juga)';


-- ============================================================
-- INDEXES
-- Untuk mempercepat query yang sering dipakai
-- ============================================================

-- Fleet Tracker: cari deployment aktif berdasarkan unit
CREATE INDEX IF NOT EXISTS idx_deployments_unit_id
    ON deployments(unit_id);

-- Fleet Tracker: filter deployment yang masih aktif (end_date IS NULL)
CREATE INDEX IF NOT EXISTS idx_deployments_end_date
    ON deployments(end_date)
    WHERE end_date IS NULL;

-- Fleet Tracker: deployment per proyek
CREATE INDEX IF NOT EXISTS idx_deployments_project_id
    ON deployments(project_id);

-- Quotation: cari items per quotation
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id
    ON quotation_items(quotation_id);

-- Quotation: cari quotation per klien
CREATE INDEX IF NOT EXISTS idx_quotations_client_id
    ON quotations(client_id);

-- Quotation: filter berdasarkan status
CREATE INDEX IF NOT EXISTS idx_quotations_status
    ON quotations(status);

-- Projects: filter berdasarkan status
CREATE INDEX IF NOT EXISTS idx_projects_status
    ON projects(status);

-- Pricelist: cari tarif aktif per unit
CREATE INDEX IF NOT EXISTS idx_pricelist_unit_active
    ON pricelist(unit_id, is_active);


-- ============================================================
-- VIEWS
-- Query yang sering dipakai, dibungkus jadi view
-- ============================================================

-- ------------------------------------------------------------
-- VIEW: unit_current_status
-- Status real-time setiap unit — dipakai oleh Fleet Tracker
-- Logic:
--   1. is_maintenance = TRUE  → 'maintenance'
--   2. Ada deployment aktif   → 'active'
--   3. Tidak ada keduanya     → 'idle'
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW unit_current_status AS
SELECT
    u.id,
    u.code,
    u.name,
    u.category,
    u.subcategory,
    u.year,
    u.plate_or_serial,
    u.is_active,
    u.is_maintenance,
    CASE
        WHEN u.is_maintenance = TRUE THEN 'maintenance'
        WHEN d.id IS NOT NULL        THEN 'active'
        ELSE                              'idle'
    END AS status,
    d.project_id AS active_project_id,
    p.name       AS active_project_name,
    d.start_date AS deployment_start_date
FROM units u
LEFT JOIN deployments d
    ON d.unit_id = u.id
    AND d.end_date IS NULL          -- Hanya deployment yang belum selesai
LEFT JOIN projects p
    ON p.id = d.project_id
WHERE u.is_active = TRUE;           -- Unit yang sudah di-nonaktifkan tidak tampil

COMMENT ON VIEW unit_current_status IS 'Status real-time semua unit aktif — digunakan Fleet Tracker. Jangan disimpan ke tabel, selalu query fresh dari view ini.';


-- ------------------------------------------------------------
-- VIEW: quotation_totals
-- Total kalkulasi per quotation (subtotal items + diskon + PPN)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW quotation_totals AS
SELECT
    q.id,
    q.number,
    q.client_id,
    c.company_name          AS client_name,
    q.project_id,
    p.name                  AS project_name,
    q.status,
    q.discount_amount,
    q.tax_percentage,
    q.valid_until,
    q.created_at,
    q.approved_at,
    COALESCE(SUM(qi.subtotal), 0)                                           AS subtotal_items,
    COALESCE(SUM(qi.subtotal), 0) - q.discount_amount                      AS subtotal_after_discount,
    ROUND(
        (COALESCE(SUM(qi.subtotal), 0) - q.discount_amount)
        * (q.tax_percentage / 100), 2
    )                                                                       AS tax_amount,
    ROUND(
        (COALESCE(SUM(qi.subtotal), 0) - q.discount_amount)
        * (1 + q.tax_percentage / 100), 2
    )                                                                       AS grand_total
FROM quotations q
LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
LEFT JOIN clients c          ON c.id = q.client_id
LEFT JOIN projects p         ON p.id = q.project_id
GROUP BY q.id, c.company_name, p.name;

COMMENT ON VIEW quotation_totals IS 'Total kalkulasi per quotation: subtotal items, diskon, PPN, grand total';


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: generate_quotation_number()
-- Generate nomor quotation otomatis: QUO-YYYY-XXXX
-- Dipanggil dari Server Action saat membuat quotation baru
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
    current_year  TEXT;
    seq_count     INTEGER;
    new_number    TEXT;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');

    SELECT COUNT(*) + 1
    INTO   seq_count
    FROM   quotations
    WHERE  number LIKE 'QUO-' || current_year || '-%';

    new_number := 'QUO-' || current_year || '-' || LPAD(seq_count::TEXT, 4, '0');

    -- Validasi tidak ada duplikat (race condition guard)
    WHILE EXISTS (SELECT 1 FROM quotations WHERE number = new_number) LOOP
        seq_count  := seq_count + 1;
        new_number := 'QUO-' || current_year || '-' || LPAD(seq_count::TEXT, 4, '0');
    END LOOP;

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_quotation_number IS 'Generate nomor quotation unik: QUO-YYYY-XXXX. Aman terhadap race condition.';


-- ------------------------------------------------------------
-- FUNCTION: update_updated_at()
-- Trigger function untuk otomatis update kolom updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TRIGGERS
-- updated_at otomatis diperbarui saat UPDATE
-- ============================================================

DROP TRIGGER IF EXISTS trg_clients_updated_at     ON clients;
DROP TRIGGER IF EXISTS trg_units_updated_at        ON units;
DROP TRIGGER IF EXISTS trg_projects_updated_at     ON projects;
DROP TRIGGER IF EXISTS trg_deployments_updated_at  ON deployments;
DROP TRIGGER IF EXISTS trg_quotations_updated_at   ON quotations;
DROP TRIGGER IF EXISTS trg_profiles_updated_at     ON profiles;

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_units_updated_at
    BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_deployments_updated_at
    BEFORE UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Semua tabel diamankan — hanya user terautentikasi yang bisa akses
-- ============================================================

ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE units            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricelist        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS Policies: akses penuh untuk user yang sudah login
-- Note: Server Actions menggunakan service_role_key yang bypass RLS.
-- Policy ini melindungi akses langsung dari browser (anon key).
-- ------------------------------------------------------------

-- Clients
CREATE POLICY "Authenticated users can read clients"
    ON clients FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert clients"
    ON clients FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update clients"
    ON clients FOR UPDATE TO authenticated USING (TRUE);

-- Units
CREATE POLICY "Authenticated users can read units"
    ON units FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert units"
    ON units FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update units"
    ON units FOR UPDATE TO authenticated USING (TRUE);

-- Pricelist
CREATE POLICY "Authenticated users can read pricelist"
    ON pricelist FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert pricelist"
    ON pricelist FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update pricelist"
    ON pricelist FOR UPDATE TO authenticated USING (TRUE);

-- Projects
CREATE POLICY "Authenticated users can read projects"
    ON projects FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert projects"
    ON projects FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update projects"
    ON projects FOR UPDATE TO authenticated USING (TRUE);

-- Deployments
CREATE POLICY "Authenticated users can read deployments"
    ON deployments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert deployments"
    ON deployments FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update deployments"
    ON deployments FOR UPDATE TO authenticated USING (TRUE);

-- Quotations
CREATE POLICY "Authenticated users can read quotations"
    ON quotations FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert quotations"
    ON quotations FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update quotations"
    ON quotations FOR UPDATE TO authenticated USING (TRUE);

-- Quotation Items
CREATE POLICY "Authenticated users can read quotation_items"
    ON quotation_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert quotation_items"
    ON quotation_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update quotation_items"
    ON quotation_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete quotation_items"
    ON quotation_items FOR DELETE TO authenticated USING (TRUE);

-- Profiles
CREATE POLICY "Users can read all profiles"
    ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);


-- ============================================================
-- VERIFICATION QUERIES
-- Jalankan ini setelah schema untuk memverifikasi semua tabel terbuat
-- ============================================================

-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

-- Expected output:
-- clients
-- deployments
-- pricelist
-- profiles
-- projects
-- quotation_items
-- quotations
-- units


-- ============================================================
-- EXPLICIT GRANTS
-- Diperlukan karena Supabase kadang tidak otomatis grant
-- service_role ke tabel profiles saat RLS diaktifkan.
-- Tanpa ini, query dari createAdminClient() akan return
-- error "permission denied for table profiles" (code 42501).
-- ============================================================

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;
GRANT INSERT ON public.profiles TO service_role;
GRANT UPDATE ON public.profiles TO service_role;
GRANT DELETE ON public.profiles TO service_role;

-- Grant untuk semua tabel lain (best practice)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;


-- ============================================================
-- END OF SCHEMA
-- Lanjutkan dengan menjalankan seed.sql untuk data awal
-- ============================================================
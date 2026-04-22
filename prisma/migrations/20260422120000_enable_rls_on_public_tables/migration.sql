-- Enable Row Level Security on every table in the public schema.
--
-- The app reads/writes the DB through Prisma (direct Postgres connection,
-- postgres role) and the Supabase service-role client, both of which bypass
-- RLS. The only anon-key usage is Supabase Storage, which has its own RLS on
-- storage.objects and is unaffected by this migration.
--
-- With no policies defined, enabling RLS denies all access via the anon and
-- authenticated roles through PostgREST. This closes the Supabase advisor's
-- "RLS Disabled in Public" findings.
--
-- Done as a DO block so any future tables added to public are covered if this
-- migration is re-applied manually, and so we don't need to enumerate tables.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                       r.schemaname, r.tablename);
    END LOOP;
END$$;

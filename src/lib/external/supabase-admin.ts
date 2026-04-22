import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (uses service role key).
// Lives in its own file with `server-only` so any accidental import from a
// client component fails at build time — the service-role key is never
// bundled into the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

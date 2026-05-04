import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  client = createClient(supabaseUrl, supabaseKey);
  return client;
};

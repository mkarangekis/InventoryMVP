import { createClient } from "@supabase/supabase-js";

const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const adminClient = createAdminClient();

const missingEnvProxy = new Proxy(
  {},
  {
    get() {
      throw new Error("Supabase service env vars are not set");
    },
  },
) as ReturnType<typeof createClient>;

export const supabaseAdmin = adminClient ?? missingEnvProxy;

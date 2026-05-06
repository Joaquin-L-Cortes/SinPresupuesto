import { getSupabase } from "./lib/supabase";

async function check() {
  const sb = getSupabase();
  const { data, error } = await sb.from("materiales").select("*").limit(1);
  if (error) {
    console.log("Error or table missing:", error.message);
  } else {
    console.log("Table 'materiales' exists. Rows:", data.length);
  }

  const { data: config, error: err2 } = await sb.from("site_config").select("*").limit(1);
  if (err2) {
    console.log("Error or table missing:", err2.message);
  } else {
    console.log("Table 'site_config' exists. Rows:", config.length);
  }
}

check();

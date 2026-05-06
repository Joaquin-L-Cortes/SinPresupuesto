import { getSupabase } from "./lib/supabase";
import navData from "./content/nav.json";

async function syncNav() {
  const sb = getSupabase();
  const { error } = await sb.from("site_config").upsert({
    id: "nav",
    data: navData,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error("Error syncing nav to Supabase:", error.message);
  } else {
    console.log("Nav synced successfully to Supabase!");
  }
}

syncNav();

/**
 * DATABASE CONNECTOR & 3-TIER FALLBACK STRATEGY
 * Tier 1: Live Supabase PostgreSQL
 * Tier 2: Browser localStorage Cache
 * Tier 3: Hardcoded PORTFOLIO_DATA fallback
 */

let sb = null;

if (typeof supabase !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL && !window.APP_CONFIG.SUPABASE_URL.includes("your-project-id")) {
  try {
    sb = supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn("Supabase init error:", err);
  }
}

async function loadAllData() {
  if (!sb) {
    // No Supabase configured yet -> use local data.js
    return PORTFOLIO_DATA;
  }

  try {
    const [profileRes, projectsRes, timelineRes, skillsRes] = await Promise.all([
      sb.from("profile").select("*").eq("id", 1).single(),
      sb.from("projects").select("*").order("sort_order"),
      sb.from("timeline").select("*").order("sort_order"),
      sb.from("skills").select("*").order("sort_order")
    ]);

    if (profileRes.error) throw profileRes.error;

    const dynamicData = {
      ...PORTFOLIO_DATA,
      profile: profileRes.data || PORTFOLIO_DATA.profile,
      projects: projectsRes.data && projectsRes.data.length ? projectsRes.data : PORTFOLIO_DATA.projects
    };

    localStorage.setItem("cv_cache", JSON.stringify(dynamicData));
    return dynamicData;
  } catch (err) {
    console.warn("Lỗi kết nối Supabase, kích hoạt cơ chế dự phòng Cache / data.js:", err);
    const cached = localStorage.getItem("cv_cache");
    return cached ? JSON.parse(cached) : PORTFOLIO_DATA;
  }
}

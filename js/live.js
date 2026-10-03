/**
 * REALTIME SUBSCRIPTIONS & PRESENCE (SUPABASE REALTIME)
 * 1. Tự động đồng bộ nội dung khi Admin sửa đổi mà không cần reload
 * 2. Theo dõi số người đang xem trực tuyến (Presence)
 */

// Đăng ký nhận thông báo thay đổi dữ liệu từ Supabase Realtime
function initRealtimeContent(onContentUpdate) {
  if (!sb) return;

  try {
    const channel = sb.channel("content-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profile" }, (payload) => {
        console.log("Realtime: Profile updated", payload);
        if (onContentUpdate) onContentUpdate("profile", payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        console.log("Realtime: Projects updated", payload);
        if (onContentUpdate) onContentUpdate("projects", payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "timeline" }, (payload) => {
        console.log("Realtime: Timeline updated", payload);
        if (onContentUpdate) onContentUpdate("timeline", payload);
      })
      .subscribe((status) => {
        const badge = document.getElementById("wsStatusText");
        if (badge && status === "SUBSCRIBED") {
          badge.innerText = "SUPABASE REALTIME LIVE";
        }
      });

    return channel;
  } catch (err) {
    console.warn("Lỗi khởi tạo Supabase Realtime:", err);
  }
}

// Đếm số người đang online xem Portfolio (Presence)
function initPresenceViewers() {
  if (!sb) return;

  try {
    const viewerId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'v_' + Math.random().toString(36).substr(2, 9);
    const room = sb.channel("viewers", {
      config: { presence: { key: viewerId } }
    });

    room.on("presence", { event: "sync" }, () => {
      const state = room.presenceState();
      const count = Object.keys(state).length;
      const countEl = document.getElementById("viewerCount");
      if (countEl) {
        countEl.innerText = `ONLINE: ${count} VIEWER${count > 1 ? 'S' : ''}`;
      }
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await room.track({ at: Date.now() });
      }
    });

    return room;
  } catch (err) {
    console.warn("Lỗi khởi tạo Presence:", err);
  }
}

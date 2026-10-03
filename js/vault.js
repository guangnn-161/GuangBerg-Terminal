/**
 * VAULT FILE STORAGE HELPER (SUPABASE STORAGE)
 * Quản lý kho tài liệu nghiên cứu, CV PDF và bài viết định lượng
 */

// Tải file lên kho lưu trữ
async function uploadFileToVault(file, bucket = "public-files", folder = "docs") {
  if (!sb) throw new Error("Chưa kết nối Supabase Storage.");

  const cleanName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${folder}/${Date.now()}-${cleanName}`;

  const { error: uploadError } = await sb.storage.from(bucket).upload(path, file);
  if (uploadError) throw uploadError;

  // Ghi siêu dữ liệu vào bảng vault_files
  const { error: dbError } = await sb.from("vault_files").insert({
    path: `${bucket}/${path}`,
    title: file.name,
    size_bytes: file.size,
    mime: file.type,
    is_public: bucket === "public-files"
  });

  if (dbError) console.warn("Lỗi lưu siêu dữ liệu file:", dbError);
  return path;
}

// Lấy link công khai (cho CV, tài liệu public)
function getPublicFileUrl(path, bucket = "public-files") {
  if (!sb) return "#";
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Lấy link tạm có thời hạn cho tài liệu bí mật / private (mặc định 60 giây)
async function getPrivateFileSignedUrl(path, bucket = "vault", expiresIn = 60) {
  if (!sb) throw new Error("Chưa kết nối Supabase Storage.");
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// Liệt kê danh sách file trong kho
async function listVaultFiles(isOwner = false) {
  if (!sb) return [];
  try {
    let query = sb.from("vault_files").select("*").order("created_at", { ascending: false });
    if (!isOwner) {
      query = query.eq("is_public", true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Lỗi liệt kê file vault:", err);
    return [];
  }
}

// Upload file buffer to Supabase Storage; returns public URL or null
// Requires service_role key for server uploads (Project Settings → API in Supabase).
async function uploadToSupabase(buffer, contentType, objectPath) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
  if (!base || !key) return null;
  // Supabase Storage REST API: apikey + Authorization headers, raw body
  const url = `${base}/storage/v1/object/${bucket}/${objectPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: buffer,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Storage upload failed: ${res.status}`);
  }
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}

module.exports = { uploadToSupabase };

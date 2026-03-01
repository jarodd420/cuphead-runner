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
    if (res.status === 404 && (err || '').toLowerCase().includes('bucket')) {
      throw new Error(
        `Storage bucket "${bucket}" not found. Create it in Supabase Dashboard → Storage → New bucket → name "${bucket}" → set Public.`
      );
    }
    throw new Error(err || `Storage upload failed: ${res.status}`);
  }
  let publicPath = `${bucket}/${objectPath}`;
  try {
    const data = await res.json();
    if (data && data.Key) publicPath = data.Key;
  } catch (_) {}
  const encoded = publicPath.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/${encoded}`;
}

module.exports = { uploadToSupabase };

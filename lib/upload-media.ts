export const uploadMediaFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; details?: unknown }
      | null;
    const details = payload?.details ? ` Details: ${JSON.stringify(payload.details)}` : '';
    throw new Error(`${payload?.message || 'Upload failed.'}${details}`);
  }

  const data = (await response.json()) as { url?: string };

  if (!data.url) {
    throw new Error('Upload succeeded but no URL was returned.');
  }

  return data.url;
};
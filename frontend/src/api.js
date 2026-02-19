// api.js — all backend calls live here
import axios from "axios";

// ← your backend URL
const BASE_URL = "http://127.0.0.1:8080";

// STEP 1: Upload VCF file → returns session_id
export async function uploadVCF(file) {
  const form = new FormData();
  form.append("file", file);

  const res = await axios.post(`${BASE_URL}/upload-vcf`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { session_id, pgx_variants_found, genes_with_variants }
}

// STEP 2: Analyze drug risk → returns full result
export async function analyzeDrug(sessionId, drug) {
  const res = await axios.post(`${BASE_URL}/analyze`, {
    session_id: sessionId,
    drug: drug,
  });
  return res.data; // full risk JSON
}

// Health check
export async function healthCheck() {
  const res = await axios.get(`${BASE_URL}/health`);
  return res.data;
}

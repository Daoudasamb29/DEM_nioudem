import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Support reading JSON bodies
app.use(express.json());

/**
 * Initialize Supabase client
 * Supports both server environment variables and dynamic client-passed override headers.
 */
function getSupabaseClient(req?: express.Request) {
  let url = (req?.headers['x-supabase-url'] as string) || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let key = (req?.headers['x-supabase-key'] as string) || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  url = url.trim();
  key = key.trim();

  // Check for empty or mock credentials
  if (!url || !key || url.includes('votre-projet') || key.includes('votre_cle')) {
    return null;
  }

  return createClient(url, key);
}

// API to verify backend configuration status
app.get("/api/supabase/status", (req, res) => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const isServerConfigured = url && key && !url.includes('votre-projet') && !key.includes('votre_cle');
  res.json({ configured: !!isServerConfigured });
});

// API to get public EmailJS configuration dynamically at runtime
app.get("/api/email-config", (req, res) => {
  const pKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY || "";
  const sId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID || "";
  const tId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || "";
  const toEmail = process.env.VITE_EMAILJS_TO_EMAIL || process.env.EMAILJS_TO_EMAIL || "";
  res.json({ publicKey: pKey, serviceId: sId, templateId: tId, toEmail: toEmail });
});

// API to securely proxy EmailJS requests
app.post("/api/send-email", async (req, res) => {
  const pKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY || "";
  const sId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID || "";
  const tId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || "";
  const toEmail = process.env.VITE_EMAILJS_TO_EMAIL || process.env.EMAILJS_TO_EMAIL || "";

  if (!pKey || pKey.includes("REMPLACER_PAR") || !sId || sId.includes("REMPLACER_PAR") || !tId || tId.includes("REMPLACER_PAR")) {
    console.warn("Serverless API EmailJS: Missing environment variables on server.");
    return res.status(400).json({ error: "EmailJS n'est pas configuré sur le serveur." });
  }

  const clientParams = req.body || {};
  const phoneValue = clientParams.jstelephone || clientParams.client_telephone || clientParams.phone || clientParams.telephone || "Non renseigné";
  const nameValue = clientParams.client_nom || clientParams.client_name || clientParams.name || clientParams.nom || clientParams.fullName || clientParams.fullname || clientParams.passenger_name || "Passager";

  const payload = {
    service_id: sId,
    template_id: tId,
    user_id: pKey,
    template_params: {
      ...clientParams,
      telephone: phoneValue,
      phone: phoneValue,
      client_telephone: phoneValue,
      jstelephone: phoneValue,
      client_phone: phoneValue,
      client_tel: phoneValue,
      telephone_client: phoneValue,
      phone_client: phoneValue,
      tel: phoneValue,
      client_nom: nameValue,
      client_name: nameValue,
      name: nameValue,
      nom: nameValue,
      fullName: nameValue,
      fullname: nameValue,
      passenger_name: nameValue,
      to_email: toEmail
    }
  };

  try {
    const emailjsRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://api.emailjs.com",
        "Referer": "https://api.emailjs.com/"
      },
      body: JSON.stringify(payload)
    });

    if (!emailjsRes.ok) {
      const errorText = await emailjsRes.text();
      console.error("EmailJS API response failure:", emailjsRes.status, errorText);
      return res.status(emailjsRes.status).json({ error: errorText || "EmailJS a retourné une erreur lors de l'envoi." });
    }

    return res.json({ success: true, status: emailjsRes.status });
  } catch (err: any) {
    console.error("Serverless exception proxying email:", err);
    return res.status(500).json({ error: err?.message || "Erreur interne lors de l'envoi." });
  }
});

// API to test specific credentials
app.post("/api/supabase/test", async (req, res) => {
  const { url, key } = req.body;
  if (!url || !key) {
    return res.status(400).json({ success: false, message: "L'URL et la clé anonyme sont requises." });
  }

  try {
    const client = createClient(url, key);
    const { data, error } = await client.from('bookings').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('404')) {
        return res.json({
          success: true,
          message: "Connecté à Supabase, mais la table 'bookings' est manquante."
        });
      }
      return res.json({ success: false, message: `Erreur Supabase: ${error.message}` });
    }
    return res.json({ success: true, message: "Connexion réussie !" });
  } catch (err: any) {
    return res.json({ success: false, message: err?.message || "Erreur de connexion." });
  }
});

// API to fetch all bookings
app.get("/api/bookings", async (req, res) => {
  const client = getSupabaseClient(req);
  if (!client) {
    return res.status(400).json({ error: "Client Supabase non configuré." });
  }
  try {
    const { data, error } = await client
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API to create a booking
app.post("/api/bookings", async (req, res) => {
  const client = getSupabaseClient(req);
  if (!client) {
    return res.status(400).json({ error: "Client Supabase non configuré." });
  }
  try {
    const { error } = await client.from('bookings').insert([req.body]);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API to delete a booking
app.delete("/api/bookings/:id", async (req, res) => {
  const client = getSupabaseClient(req);
  if (!client) {
    return res.status(400).json({ error: "Client Supabase non configuré." });
  }
  try {
    const { id } = req.params;
    const { error } = await client.from('bookings').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default app;

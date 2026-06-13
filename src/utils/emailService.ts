import emailjs from '@emailjs/browser';

// Configuration keys for EmailJS.
// You can either:
// 1. Define these in your environment variables (using the VITE_ prefix for client-side)
// 2. Or replace the placeholders directly in this code.
export const EMAILJS_CONFIG = {
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "REMPLACER_PAR_MA_PUBLIC_KEY",
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || "REMPLACER_PAR_SERVICE_ID",
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "REMPLACER_PAR_TEMPLATE_ID",
  TO_EMAIL: import.meta.env.VITE_EMAILJS_TO_EMAIL || "REMPLACER_PAR_VOTRE_EMAIL"
};

export interface EmailParams {
  reservation_code: string;
  trajet: string;
  date: string;
  heure: string;
  pickup: string;
  passagers: number | string;
  prix_total: string;
  to_email: string;
  client_nom?: string;
  client_name?: string;
  nom?: string;
  name?: string;
  fullName?: string;
  fullname?: string;
  passenger_name?: string;
  client_telephone?: string;
  jstelephone?: string;
  telephone?: string;
  phone?: string;
  client_phone?: string;
  client_tel?: string;
  telephone_client?: string;
  phone_client?: string;
  tel?: string;
  message_vocal?: string;
  messagevocal?: string;
  vocal?: string;
  audio?: string;
  message_audio?: string;
  voice_url?: string;
  voiceMessageUrl?: string;
  voice_message_url?: string;
  audio_url?: string;
  url_vocal?: string;
  lien_vocal?: string;
  cloudinary?: string;
  cloudinary_url?: string;
}

/**
 * Sends a reservation email via EmailJS browser SDK.
 * In case of error or unconfigured state: throws an error (handled gracefully by showing a discrete banner)
 */
export async function sendReservationEmail(params: Omit<EmailParams, 'to_email'>): Promise<void> {
  console.log("Initiating backend email submission proxy...", params);

  let proxySuccess = false;
  let serverResponseError = "";

  // 1. Try server-side proxy
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (response.ok) {
      console.log("Email sent successfully via secure server-side proxy!");
      proxySuccess = true;
      return;
    }

    const responseText = await response.text().catch(() => "");
    serverResponseError = `Erreur serveur HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(responseText);
      serverResponseError = errorJson?.error || responseText || serverResponseError;
    } catch (e) {
      if (responseText) {
        serverResponseError = responseText;
      }
    }
    console.warn(`Backend email proxy failed (${response.status}): ${serverResponseError}. Initiating browser-side fallback...`);
  } catch (proxyErr: any) {
    serverResponseError = proxyErr?.message || "Connexion refusée";
    console.error("Failed to connect to backend email proxy. Initiating browser-side fallback...", proxyErr);
  }

  // 2. Client-side fallback: Fetch latest configuration dynamically from server
  console.log("Fetching live EmailJS public configuration from server...");
  let public_key = EMAILJS_CONFIG.PUBLIC_KEY;
  let service_id = EMAILJS_CONFIG.SERVICE_ID;
  let template_id = EMAILJS_CONFIG.TEMPLATE_ID;
  let to_email = EMAILJS_CONFIG.TO_EMAIL;

  try {
    const configRes = await fetch('/api/email-config');
    if (configRes.ok) {
      const configData = await configRes.json();
      if (configData.publicKey && !configData.publicKey.includes("REMPLACER_PAR") && configData.publicKey.trim() !== "") {
        public_key = configData.publicKey;
        service_id = configData.serviceId;
        template_id = configData.templateId;
        to_email = configData.toEmail;
        console.log("Dynamically loaded EmailJS configurations from server.");
      }
    }
  } catch (confErr) {
    console.warn("Could not retrieve latest runtime EmailJS variables, using static ones.", confErr);
  }

  // Check if we have valid configurations before triggering SDK
  if (
    !public_key || public_key === "REMPLACER_PAR_MA_PUBLIC_KEY" || public_key.trim() === "" ||
    !service_id || service_id === "REMPLACER_PAR_SERVICE_ID" || service_id.trim() === "" ||
    !template_id || template_id === "REMPLACER_PAR_TEMPLATE_ID" || template_id.trim() === ""
  ) {
    console.warn("EmailJS is not fully configured. Notification skipped.");
    throw new Error(`EmailJS n'est pas configuré. (Erreur proxy d'origine: ${serverResponseError})`);
  }

  // 3. Attempt client-side direct EmailJS as secondary safety mechanism
  try {
    emailjs.init(public_key);
    const phoneValue = params.jstelephone || params.client_telephone || params.phone || params.telephone || "Non renseigné";
    const nameValue = (params as any).client_nom || (params as any).client_name || (params as any).name || (params as any).nom || (params as any).fullName || (params as any).fullname || (params as any).passenger_name || "Passager";

    const audioVal = params.message_vocal || (params as any).voiceMessageUrl || (params as any).voice_url;

    const payload: EmailParams = {
      ...params,
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
      to_email: to_email,
      message_vocal: audioVal,
      messagevocal: audioVal,
      message_audio: audioVal,
      vocal: audioVal,
      audio: audioVal,
      voice_url: audioVal,
      voice_message_url: audioVal,
      audio_url: audioVal,
      url_vocal: audioVal,
      lien_vocal: audioVal,
      cloudinary: audioVal,
      cloudinary_url: audioVal
    };
    await emailjs.send(service_id, template_id, payload as any);
    console.log("Client-side direct EmailJS fallback succeeded!");
  } catch (fallbackErr: any) {
    console.error("Both backend proxy and client-side fallback failed:", fallbackErr);
    throw new Error(`Échec de l'envoi de l'e-mail. Proxy : ${serverResponseError}. Fallback : ${fallbackErr?.message || "Erreur de service"}`);
  }
}

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;

/**
 * Normalizes phone numbers to Meta standard: numbers only, including country code (e.g., "5511999999999").
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If the number doesn't start with the country code (55 for Brazil) and is a standard Brazilian number,
  // we can prepend 55. For simplicity, if length is less than 12 digits, we assume it needs country code 55.
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

/**
 * Generates SHA-256 hash for a given string as required by Meta.
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

interface MetaEventPayload {
  eventName: 'Contact' | 'SubmitApplication' | 'Purchase';
  eventId: string;
  phone?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  clientUserAgent?: string;
  clientIpAddress?: string;
  value?: number;
  currency?: string;
}

/**
 * Sends a conversion event to Meta Graph API
 */
export async function sendMetaConversionEvent(payload: MetaEventPayload) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn('[Meta CAPI] Missing META_PIXEL_ID or META_ACCESS_TOKEN in env. Event not sent to Meta.');
    return { success: false, error: 'Credentials not configured' };
  }

  const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  // Build fbc and fbp properly if they are not formatted
  // Meta expects fbc in format: fb.1.creation_time.fbclid
  // If we only have fbclid, we can construct a basic fbc, or pass it directly.
  let fbc = payload.fbc;
  if (!fbc && payload.fbclid) {
    const timestamp = Math.floor(Date.now() / 1000);
    fbc = `fb.1.${timestamp}.${payload.fbclid}`;
  }

  const userData: any = {};

  if (payload.phone) {
    const normalizedPhone = normalizePhoneNumber(payload.phone);
    userData.ph = [sha256(normalizedPhone)];
  }

  if (fbc) {
    userData.fbc = fbc;
  }

  if (payload.fbp) {
    userData.fbp = payload.fbp;
  }

  // Fallback to standard User Agent if not provided
  userData.client_user_agent = payload.clientUserAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
  
  if (payload.clientIpAddress) {
    userData.client_ip_address = payload.clientIpAddress;
  }

  const eventData: any = {
    event_name: payload.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: payload.eventId,
    user_data: userData,
    action_source: 'system_generated'
  };

  // Add custom data for Purchases
  if (payload.eventName === 'Purchase') {
    eventData.custom_data = {
      value: payload.value || 0,
      currency: payload.currency || 'BRL'
    };
  }

  const requestBody: any = {
    data: [eventData]
  };

  // If testing, include the test_event_code
  if (TEST_EVENT_CODE) {
    requestBody.test_event_code = TEST_EVENT_CODE;
  }

  try {
    const response = await axios.post(url, requestBody);
    console.log(`[Meta CAPI] Event ${payload.eventName} sent successfully:`, response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error(`[Meta CAPI] Error sending event ${payload.eventName}:`, errorDetails);
    return { success: false, error: errorDetails };
  }
}

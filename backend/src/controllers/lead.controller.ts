import { Request, Response } from 'express';
import { query } from '../config/database';
import { sendMetaConversionEvent } from '../services/meta-capi.service';

/**
 * Creates a new lead tracking entry (triggered by the landing page JS script)
 */
export async function createLead(req: Request, res: Response) {
  const {
    refCode,
    fbclid,
    fbp,
    fbc,
    utm_source,
    utm_medium,
    utm_campaign
  } = req.body;

  if (!refCode) {
    return res.status(400).json({ error: 'refCode is required' });
  }

  // Get user agent and IP address from request headers
  const clientUserAgent = req.headers['user-agent'] || '';
  const clientIpAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();

  try {
    // Insert into database
    const insertQuery = `
      INSERT INTO leads_tracking (ref_code, fbclid, fbp, fbc, utm_source, utm_medium, utm_campaign, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'initiated')
      ON CONFLICT (ref_code) DO UPDATE 
      SET fbclid = EXCLUDED.fbclid, fbp = EXCLUDED.fbp, fbc = EXCLUDED.fbc, 
          utm_source = EXCLUDED.utm_source, utm_medium = EXCLUDED.utm_medium, utm_campaign = EXCLUDED.utm_campaign
      RETURNING *
    `;
    const dbResult = await query(insertQuery, [refCode, fbclid, fbp, fbc, utm_source, utm_medium, utm_campaign]);
    const lead = dbResult.rows[0];

    // Fire the Contact event to Meta immediately
    const metaResponse = await sendMetaConversionEvent({
      eventName: 'Contact',
      eventId: `contact_${lead.id}`,
      fbclid,
      fbc,
      fbp,
      clientUserAgent,
      clientIpAddress
    });

    return res.status(201).json({
      message: 'Lead initiated successfully',
      lead,
      metaContactSent: metaResponse.success
    });
  } catch (error: any) {
    console.error('Error initiating lead:', error);
    return res.status(500).json({ error: 'Failed to initiate lead', details: error.message });
  }
}

/**
 * Searches for a lead by refCode (used by Admin dashboard before updating)
 */
export async function getLeadByRefCode(req: Request, res: Response) {
  const { refCode } = req.params;

  try {
    const dbResult = await query('SELECT * FROM leads_tracking WHERE ref_code = $1', [refCode]);
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.status(200).json(dbResult.rows[0]);
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Updates status/phone of a lead and fires relevant Meta conversion event
 */
export async function updateLeadStatus(req: Request, res: Response) {
  const { refCode, phoneNumber, status, value } = req.body;

  if (!refCode || !status) {
    return res.status(400).json({ error: 'refCode and status are required' });
  }

  if (!['data_shared', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "data_shared" or "completed"' });
  }

  // Get user agent and IP address from request headers
  const clientUserAgent = req.headers['user-agent'] || '';
  const clientIpAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();

  try {
    // 1. Check if lead exists
    const findResult = await query('SELECT * FROM leads_tracking WHERE ref_code = $1', [refCode]);
    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead with this reference code was not found' });
    }

    const lead = findResult.rows[0];

    // 2. Update status and phone number
    const updateQuery = `
      UPDATE leads_tracking 
      SET status = $1, phone_number = COALESCE($2, phone_number)
      WHERE ref_code = $3
      RETURNING *
    `;
    const updateResult = await query(updateQuery, [status, phoneNumber || lead.phone_number, refCode]);
    const updatedLead = updateResult.rows[0];

    // 3. Determine and trigger Meta event
    let metaResponse = { success: false, error: 'Event not triggered' };
    
    if (status === 'data_shared') {
      metaResponse = await sendMetaConversionEvent({
        eventName: 'SubmitApplication',
        eventId: `submit_${updatedLead.id}`,
        phone: phoneNumber || updatedLead.phone_number,
        fbclid: updatedLead.fbclid,
        fbc: updatedLead.fbc,
        fbp: updatedLead.fbp,
        clientUserAgent,
        clientIpAddress
      });
    } else if (status === 'completed') {
      metaResponse = await sendMetaConversionEvent({
        eventName: 'Purchase',
        eventId: `purchase_${updatedLead.id}`,
        phone: phoneNumber || updatedLead.phone_number,
        fbclid: updatedLead.fbclid,
        fbc: updatedLead.fbc,
        fbp: updatedLead.fbp,
        clientUserAgent,
        clientIpAddress,
        value: Number(value) || 0,
        currency: 'BRL'
      });
    }

    return res.status(200).json({
      message: `Lead updated to ${status} successfully`,
      lead: updatedLead,
      metaEventSent: metaResponse.success,
      metaResponse: metaResponse
    });

  } catch (error: any) {
    console.error('Error updating lead status:', error);
    return res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
}

import { Router } from 'express';
import { createLead, getLeadByRefCode, updateLeadStatus } from '../controllers/lead.controller';

const router = Router();

// Endpoint for landing page script to register/initiate a lead
router.post('/leads', createLead);

// Endpoint for admin dashboard to find a lead's current info
router.get('/leads/:refCode', getLeadByRefCode);

// Endpoint for admin dashboard to update lead status (SubmitApplication or Purchase)
router.post('/leads/status', updateLeadStatus);

export default router;

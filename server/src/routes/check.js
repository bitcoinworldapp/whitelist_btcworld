import express from 'express';
import Whitelist from '../models/Whitelist.js';

const router = express.Router();

router.get('/check', async (req, res) => {
  try {
    const raw = typeof req.query.address === 'string' ? req.query.address : '';
    const norm = Whitelist.normalize(raw);
    if (!norm) return res.status(400).json({ ok: false, error: 'address_required' });

    const hit = await Whitelist.findOne({ normalized: norm }).lean();
    res.json({ exists: !!hit });
  } catch (e) {
    console.error('CHECK_ERR', e);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;

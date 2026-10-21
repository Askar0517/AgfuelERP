import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';

export const pricingController = {
  getFuels: async (_req: Request, res: Response) => {
    try {
      const fuels = await dbService.getFuels();
      res.json(fuels);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateFuelRate: async (req: Request, res: Response) => {
    try {
      const { rate } = req.body;
      if (typeof rate !== 'number' || rate <= 0) {
        return res.status(400).json({ error: 'Valid positive rate number required' });
      }
      const updated = await dbService.updateFuelRate(req.params.code, rate);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

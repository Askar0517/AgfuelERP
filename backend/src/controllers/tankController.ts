import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';

export const tankController = {
  getTanks: async (req: Request, res: Response) => {
    try {
      const stationId = req.query.stationId as string | undefined;
      const tanks = await dbService.getTanks(stationId);
      res.json(tanks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getNextTankCode: async (_req: Request, res: Response) => {
    try {
      const nextCode = await dbService.getNextTankCode();
      res.json({ nextCode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getTank: async (req: Request, res: Response) => {
    try {
      const tank = await dbService.getTank(req.params.id);
      if (!tank) return res.status(404).json({ error: 'Tank not found' });
      res.json(tank);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createTank: async (req: Request, res: Response) => {
    try {
      const tank = await dbService.createTank(req.body);
      res.status(201).json(tank);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  updateTank: async (req: Request, res: Response) => {
    try {
      const updated = await dbService.updateTank(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  deactivateTank: async (req: Request, res: Response) => {
    try {
      const targetStatus = req.body?.status as 'INACTIVE' | 'MAINTENANCE' | undefined;
      const updated = await dbService.deactivateTank(req.params.id, targetStatus);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteTank: async (req: Request, res: Response) => {
    try {
      const result = await dbService.deleteTank(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  recordDip: async (req: Request, res: Response) => {
    try {
      const { dipCm, waterDipCm } = req.body;
      if (typeof dipCm !== 'number') return res.status(400).json({ error: 'dipCm number required' });
      const updated = await dbService.recordTankDip(req.params.id, dipCm, waterDipCm || 0.2);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  decantLoad: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const result = await dbService.decantTankerLoad({
        tankId: req.params.id,
        operatorName: user?.name || user?.username || req.body.operatorName || 'Administrator',
        ...req.body,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  getTankLoads: async (req: Request, res: Response) => {
    try {
      const stationId = req.query.stationId as string | undefined;
      const loads = await dbService.getTankLoads(stationId);
      res.json(loads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

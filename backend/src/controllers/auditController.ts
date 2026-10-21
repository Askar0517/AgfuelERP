import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';

export const auditController = {
  resolveQR: async (req: Request, res: Response) => {
    try {
      const resolved = await dbService.resolveQRCode(req.params.identifier);
      res.json(resolved);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  getAuditLogs: async (req: Request, res: Response) => {
    try {
      const { entity, entityId } = req.query;
      const logs = await dbService.getAuditLogs(entity as string, entityId as string);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

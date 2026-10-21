import { Router } from 'express';
import { auditController } from '../controllers/auditController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';

const router = Router();

router.get('/resolve/:identifier', auditController.resolveQR);
router.get('/', verifyPrivilege('AUDIT_LOGS', 'READ'), auditController.getAuditLogs);

export default router;

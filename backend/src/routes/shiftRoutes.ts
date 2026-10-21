import { Router } from 'express';
import { shiftController } from '../controllers/shiftController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';

const router = Router();

router.get('/', verifyPrivilege('SHIFTS', 'READ'), shiftController.getShifts);
router.post('/create', verifyPrivilege('SHIFTS', 'CREATE'), shiftController.createShift);
router.post('/:id/close', verifyPrivilege('SHIFTS', 'UPDATE'), shiftController.closeShift);

export default router;

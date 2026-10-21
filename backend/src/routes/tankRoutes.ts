import { Router } from 'express';
import { tankController } from '../controllers/tankController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';

const router = Router();

router.get('/', verifyPrivilege('TANKS', 'READ'), tankController.getTanks);
router.get('/next-code', verifyPrivilege('TANKS', 'READ'), tankController.getNextTankCode);
router.get('/:id', verifyPrivilege('TANKS', 'READ'), tankController.getTank);
router.post('/', verifyPrivilege('TANKS', 'CREATE'), tankController.createTank);
router.put('/:id', verifyPrivilege('TANKS', 'UPDATE'), tankController.updateTank);
router.post('/:id/deactivate', verifyPrivilege('TANKS', 'UPDATE'), tankController.deactivateTank);
router.delete('/:id', verifyPrivilege('TANKS', 'DELETE'), tankController.deleteTank);
router.post('/:id/dip', verifyPrivilege('TANKS', 'UPDATE'), tankController.recordDip);
router.post('/:id/decant', verifyPrivilege('TANKS', 'CREATE'), tankController.decantLoad);

export default router;

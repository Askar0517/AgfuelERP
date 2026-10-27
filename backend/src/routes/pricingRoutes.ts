import { Router } from 'express';
import { pricingController } from '../controllers/pricingController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';

const router = Router();

router.get('/', pricingController.getFuels);
router.post('/:code/rate', verifyPrivilege('PRICING', 'UPDATE'), pricingController.updateFuelRate);
router.post('/:code/reset', verifyPrivilege('PRICING', 'UPDATE'), pricingController.resetFuelRate);

export default router;

const express = require('express');
const router = express.Router();
const productsController = require('./controllers/productsController');

router.get('/', productsController.getHomePage);
router.get('/realtimeproducts', productsController.getRealTimeProducts);
router.use('/api/products', productsController.productsRouter);

module.exports = router;

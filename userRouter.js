const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

router.put('/premium/:uid', userController.updateUserToPremium);
router.post('/:uid/documents', userController.uploadDocuments);

module.exports = router;

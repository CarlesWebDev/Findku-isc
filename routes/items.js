const express = require('express');
const router = express.Router();
const multer = require('multer');
const itemsController = require('../controllers/itemsController');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', itemsController.getItems);
router.get('/:id', itemsController.getItemById);
router.post('/', upload.single('foto'), itemsController.createItem);
router.put('/:id', upload.single('foto'), itemsController.updateItem);
router.patch('/:id/status', itemsController.markClaimed);
router.delete('/:id', itemsController.deleteItem);

module.exports = router;
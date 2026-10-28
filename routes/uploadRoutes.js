const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

// Memory storage for fast processing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB file size limit
});

// Upload batch data (CSV, JSON, BSON)
router.post('/batch', upload.single('file'), uploadController.uploadBatchData);

// Download templates
router.get('/template/csv', uploadController.downloadCsvTemplate);
router.get('/template/json', uploadController.downloadJsonTemplate);

// Export BSON
router.get('/export/bson', uploadController.exportBson);

module.exports = router;

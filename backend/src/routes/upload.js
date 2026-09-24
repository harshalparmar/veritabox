import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Anchored extension allowlist + MIME allowlist. Both must match so a file
// can't slip through via a lookalike extension (e.g. ".pdfx") or a spoofed
// content-type.
const ALLOWED_EXT = /\.(jpe?g|png|pdf|docx?)$/i;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function checkFileType(file, cb) {
  const extOk = ALLOWED_EXT.test(path.extname(file.originalname));
  const mimeOk = ALLOWED_MIME.has(file.mimetype);

  if (extOk && mimeOk) {
    return cb(null, true);
  }
  cb(new Error('Payloads must exclusively be standard PDFs, DOCX, or images (.png, .jpg, .jpeg)!'));
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Custom wrapper to catch Multer errors and return them as JSON
router.post('/', protect, (req, res) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    
    if (req.file) {
      res.json({
        message: 'Upload successful',
        filePath: `/uploads/${req.file.filename}`,
      });
    } else {
      res.status(400).json({ message: 'No file provided' });
    }
  });
});

router.delete('/:filename', protect, isAdmin, (req, res) => {
  const filename = req.params.filename;
  // Security: Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'File not found' });
      }
      return res.status(500).json({ message: 'Error deleting file: ' + err.message });
    }
    res.json({ message: 'Artifact purged from filesystem' });
  });
});

export default router;

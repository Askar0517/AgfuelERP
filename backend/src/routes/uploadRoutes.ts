import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = Router();

// Ensure uploads folder exists in working directory or /tmp in serverless
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn('[Uploads Directory Init Warning]:', err.message);
}

interface UploadBody {
  dataUrl?: string;
  image?: string;
  base64?: string;
  filename?: string;
  category?: string; // 'profile' | 'invoice' | 'reading'
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as UploadBody;
    const rawDataUrl = body.dataUrl || body.image || body.base64;

    if (!rawDataUrl || typeof rawDataUrl !== 'string') {
      return res.status(400).json({ error: 'No image data provided. Expected base64 dataUrl string.' });
    }

    // Parse base64 data URL e.g. "data:image/png;base64,iVBORw0KGgo..."
    const matches = rawDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = rawDataUrl;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    // Determine extension
    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('svg')) ext = 'svg';

    const category = (body.category || 'upload').replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeFilename = `${category}_${timestamp}_${randomSuffix}.${ext}`;

    const filePath = path.join(UPLOADS_DIR, safeFilename);
    const buffer = Buffer.from(base64Data, 'base64');

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${safeFilename}`;

    return res.status(201).json({
      success: true,
      url: fileUrl,
      filename: safeFilename,
      size: buffer.length,
      category,
      mimeType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process file upload' });
  }
});

// GET /api/upload/list - optional helper to list uploads
router.get('/list', async (_req: Request, res: Response) => {
  try {
    const files = await fs.promises.readdir(UPLOADS_DIR);
    const list = files.map((f) => ({
      name: f,
      url: `/uploads/${f}`,
    }));
    res.json({ files: list, count: list.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

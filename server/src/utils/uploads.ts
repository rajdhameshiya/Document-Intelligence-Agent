import fs from 'fs';
import path from 'path';

export const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

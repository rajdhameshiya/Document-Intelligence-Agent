import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { ingestDocument } from '../services/documentIngestion';
import { fail, getErrorMessage, ok } from '../utils/api';
import { ensureUploadDir, UPLOAD_DIR } from '../utils/uploads';

export const telegramRouter = express.Router();

interface TelegramFileResponse {
  ok: boolean;
  result?: {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  };
  description?: string;
}

telegramRouter.get('/health', (_req, res) => {
  return ok(res, { status: 'telegram webhook ready' });
});

telegramRouter.post('/', async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return fail(res, 'TELEGRAM_NOT_CONFIGURED', 'TELEGRAM_BOT_TOKEN is not configured', 500);

    const message = req.body.message || req.body.edited_message;
    if (!message) return ok(res, { ignored: true, reason: 'No message in update' });

    const attachment = getTelegramAttachment(message);
    if (!attachment) {
      return ok(res, { ignored: true, reason: 'No supported document or photo attachment' });
    }

    const filePath = await getTelegramFilePath(token, attachment.fileId);
    const storedFileName = `${uuid()}${path.extname(attachment.fileName || filePath || '') || '.bin'}`;
    await downloadTelegramFile(token, filePath, storedFileName);

    const senderIdentity = buildSenderIdentity(message);
    const caption = message.caption || message.text || '';
    const shipmentReference = findShipmentReference(caption);

    const document = ingestDocument({
      channel: 'telegram',
      fileName: attachment.fileName || storedFileName,
      storedFileName,
      senderIdentity,
      shipmentReference
    });

    await sendTelegramMessage(
      token,
      message.chat.id,
      `Document received: ${document.fileName}\nStatus: ${document.status}\n${shipmentReference ? `Linked hint: ${shipmentReference}` : 'No shipment reference found; it will appear as unmatched.'}`
    );

    return ok(res, { received: true, documentId: document.id });
  } catch (error) {
    return fail(res, 'TELEGRAM_WEBHOOK_FAILED', getErrorMessage(error), 500);
  }
});

function getTelegramAttachment(message: any): { fileId: string; fileName?: string } | null {
  if (message.document?.file_id) {
    return {
      fileId: message.document.file_id,
      fileName: message.document.file_name
    };
  }

  if (message.photo?.length > 0) {
    const largestPhoto = message.photo[message.photo.length - 1];
    return {
      fileId: largestPhoto.file_id,
      fileName: `telegram-photo-${message.message_id}.jpg`
    };
  }

  return null;
}

async function getTelegramFilePath(token: string, fileId: string): Promise<string> {
  const response = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = (await response.json()) as TelegramFileResponse;

  if (!response.ok || !data.ok || !data.result?.file_path) {
    throw new Error(data.description || 'Unable to get Telegram file path');
  }

  return data.result.file_path;
}

async function downloadTelegramFile(token: string, filePath: string, storedFileName: string): Promise<void> {
  ensureUploadDir();
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!response.ok) throw new Error(`Unable to download Telegram file: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(path.join(UPLOAD_DIR, storedFileName), Buffer.from(arrayBuffer));
}

async function sendTelegramMessage(token: string, chatId: string | number, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch {
    // Acknowledgement messages should not block ingestion.
  }
}

function buildSenderIdentity(message: any): string {
  const from = message.from || {};
  const username = from.username ? `@${from.username}` : [from.first_name, from.last_name].filter(Boolean).join(' ');
  return `telegram:${from.id || message.chat?.id}${username ? `:${username}` : ''}`;
}

function findShipmentReference(text: string): string | null {
  const match = text.match(/SHIP-\d{4}-\d{3}/i);
  return match?.[0]?.toUpperCase() || null;
}

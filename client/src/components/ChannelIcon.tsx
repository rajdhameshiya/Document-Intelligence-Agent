import { Mail, MessageCircle, Upload } from 'lucide-react';
import { Channel } from '../types';

export function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel === 'email') return <Mail className="h-4 w-4 text-blue-500" />;
  if (channel === 'whatsapp') return <MessageCircle className="h-4 w-4 text-green-500" />;
  return <Upload className="h-4 w-4 text-slate-500" />;
}

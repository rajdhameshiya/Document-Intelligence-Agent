import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

export function SLACountdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('OVERDUE');
        setIsCritical(true);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
      setIsCritical(hours < 2);
    };
    update();
    const interval = window.setInterval(update, 60000);
    return () => window.clearInterval(interval);
  }, [deadline]);

  return (
    <div className={cn('flex items-center gap-1 text-xs font-medium', isCritical ? 'animate-pulse text-red-600' : 'text-yellow-600')}>
      <Clock className="h-3 w-3" />
      <span>{timeLeft}</span>
    </div>
  );
}

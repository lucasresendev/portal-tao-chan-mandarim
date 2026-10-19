'use client';

import { useState, useEffect, useRef } from 'react';

interface UseCountdownTimerProps {
  tempoLimiteMinutos: number;
  iniciadoEm: string;
  onTimeUp: () => void;
  onTick?: (elapsedSeconds: number) => void;
}

export function useCountdownTimer({
  tempoLimiteMinutos,
  iniciadoEm,
  onTimeUp,
  onTick,
}: UseCountdownTimerProps) {
  const totalSeconds = tempoLimiteMinutos * 60;

  const [secondsLeft, setSecondsLeft] = useState(() => {
    const start = new Date(iniciadoEm).getTime();
    const deadline = start + totalSeconds * 1000;
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  const timeUpCalled = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!timeUpCalled.current) {
            timeUpCalled.current = true;
            onTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp]);

  useEffect(() => {
    if (!onTick) return;
    const elapsed = Math.max(0, totalSeconds - secondsLeft);
    onTick(elapsed);
  }, [secondsLeft, onTick, totalSeconds]);

  return { secondsLeft, totalSeconds };
}

interface TimerViewProps {
  secondsLeft: number;
  totalSeconds: number;
  isRedBackground?: boolean;
}

export function TimerView({ secondsLeft, totalSeconds, isRedBackground }: TimerViewProps) {
  const isExpired = secondsLeft === 0;
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  const timeString = h > 0
    ? `${h}h${String(m).padStart(2, '0')}m`
    : `${m}m${String(s).padStart(2, '0')}s`;

  const percentLeft = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const isUrgent = !isExpired && percentLeft < 20;

  if (isExpired) {
    return (
      <div className="flex items-center gap-1 font-bold text-[12px]">
        <span className={`tabular-nums tracking-tight ${isRedBackground ? 'text-white' : 'text-red-500'}`}>
          0m00s
        </span>
      </div>
    );
  }

  const textColor = isRedBackground
    ? 'text-white'
    : isUrgent ? 'text-red-500' : 'text-slate-400';

  return (
    <div className={`flex items-center gap-1 font-bold transition-colors ${textColor} ${isUrgent ? 'animate-pulse' : ''}`}>
      <span className="tabular-nums tracking-tight text-[12px]">
        {timeString}
      </span>
    </div>
  );
}

interface TimerProps extends UseCountdownTimerProps {
  isRedBackground?: boolean;
}

export default function Timer(props: TimerProps) {
  const { secondsLeft, totalSeconds } = useCountdownTimer(props);
  return (
    <TimerView
      secondsLeft={secondsLeft}
      totalSeconds={totalSeconds}
      isRedBackground={props.isRedBackground}
    />
  );
}

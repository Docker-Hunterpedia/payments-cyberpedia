import { Check, Copy } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // clipboard API needs a secure context — fall back for plain-http LAN use
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (await copyText(value)) {
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error('Could not copy — select and copy manually');
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => void handleCopy(event)}
      aria-label={`Copy ${label ?? value}`}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-line/60 hover:text-ink',
        copied && 'text-paid hover:text-paid',
        className,
      )}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  );
}

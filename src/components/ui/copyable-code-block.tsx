
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyableCodeBlockProps {
  codeString: string;
  className?: string;
}

export const CopyableCodeBlock: React.FC<CopyableCodeBlockProps> = ({ codeString, className }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      toast({ title: '¡Copiado!', description: 'El esquema JSON ha sido copiado al portapapeles.' });
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({ title: 'Error al Copiar', description: 'No se pudo copiar el esquema.', variant: 'destructive' });
    }
  };

  return (
    <div className={cn("relative p-4 bg-muted/80 dark:bg-muted/50 rounded-md border border-border", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={handleCopy}
        aria-label="Copiar código"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="overflow-x-auto text-sm whitespace-pre-wrap">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

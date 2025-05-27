
"use client";

import { UploadCloud } from 'lucide-react';
import type { FC, ReactNode, DragEvent, ChangeEvent } from 'react';
import React, { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileDndInputProps {
  id: string;
  onFileSelected: (file: File | null) => void;
  accept?: string; // e.g., ".json, .pdf, image/*"
  disabled?: boolean;
  label?: string;
  className?: string;
  icon?: ReactNode;
  maxSize?: number; // Max size in bytes
}

export const FileDndInput: FC<FileDndInputProps> = ({
  id,
  onFileSelected,
  accept,
  disabled = false,
  label = "Arrastra y suelta un archivo aquí, o haz clic para seleccionar",
  className,
  icon = <UploadCloud className="h-10 w-10 text-muted-foreground" />,
  maxSize, // Max size in megabytes
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = useCallback((file: File | null) => {
    if (!file) {
      onFileSelected(null);
      return;
    }

    // File type validation
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim().toLowerCase());
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      const fileExtension = `.${fileName.split('.').pop()}`;

      let isAccepted = false;
      for (const acceptedType of acceptedTypes) {
        if (acceptedType.startsWith('.')) { // extension check
          if (fileExtension === acceptedType) {
            isAccepted = true;
            break;
          }
        } else if (acceptedType.endsWith('/*')) { // wildcard MIME type
          if (fileType.startsWith(acceptedType.slice(0, -2))) {
            isAccepted = true;
            break;
          }
        } else { // specific MIME type
          if (fileType === acceptedType) {
            isAccepted = true;
            break;
          }
        }
      }
      if (!isAccepted) {
        toast({
          title: "Tipo de archivo no válido",
          description: `Por favor, sube un archivo de tipo: ${accept}`,
          variant: "destructive",
        });
        onFileSelected(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    // File size validation
    if (maxSize && file.size > maxSize) {
       toast({
        title: "Archivo demasiado grande",
        description: `El tamaño máximo permitido es ${maxSize / 1024 / 1024} MB.`,
        variant: "destructive",
      });
      onFileSelected(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    onFileSelected(file);
     if (fileInputRef.current) fileInputRef.current.value = ""; // Reset after successful processing
  }, [accept, maxSize, onFileSelected, toast]);


  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDraggingOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [disabled]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    } else {
      processFile(null);
    }
  }, [disabled, processFile]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    } else {
      processFile(null);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors",
        "border-border hover:border-primary/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isDraggingOver && !disabled && "border-primary bg-primary/10",
        disabled && "cursor-not-allowed bg-muted/50 opacity-50",
        !disabled && "cursor-pointer",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-labelledby={`${id}-label`}
    >
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      {icon}
      <p id={`${id}-label`} className="mt-2 text-sm text-muted-foreground text-center">
        {label}
      </p>
    </div>
  );
};

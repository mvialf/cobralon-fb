"use client";

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EventType } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { enrichEventTitle } from '@/ai/flows/enrich-event-title';
import { Wand2, Trash2, Save, Loader2 } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  eventData?: EventType | Partial<Omit<EventType, 'id'>> | null;
  onClose: () => void;
  onSave: (event: Omit<EventType, 'id'> & { id?: string }) => void;
  onDelete?: (eventId: string) => void;
}

const defaultColor = 'hsl(var(--primary))'; // Default to primary color

export function EventModal({
  isOpen,
  eventData,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();


  useEffect(() => {
    if (eventData) {
      setCurrentId((eventData as EventType).id);
      setName(eventData.name || '');
      
      const start = eventData.startDate ? new Date(eventData.startDate) : new Date();
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().substring(0, 5));

      const end = eventData.endDate ? new Date(eventData.endDate) : new Date(start.getTime() + 3600000); // Default 1 hour duration
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().substring(0, 5));
      
      setDescription(eventData.description || '');
      setColor(eventData.color || defaultColor);
    } else {
      // New event, default to now + 1 hour
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 3600000);
      setCurrentId(undefined);
      setName('');
      setStartDate(now.toISOString().split('T')[0]);
      setStartTime(now.toTimeString().substring(0, 5));
      setEndDate(oneHourLater.toISOString().split('T')[0]);
      setEndTime(oneHourLater.toTimeString().substring(0, 5));
      setDescription('');
      setColor(defaultColor);
    }
  }, [eventData]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Event name is required.", variant: "destructive" });
      return;
    }

    const combinedStartDate = new Date(`${startDate}T${startTime}`);
    const combinedEndDate = new Date(`${endDate}T${endTime}`);

    if (combinedEndDate < combinedStartDate) {
      toast({ title: "Validation Error", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }
    
    const eventToSave: Omit<EventType, 'id'> & { id?: string } = {
      name,
      startDate: combinedStartDate,
      endDate: combinedEndDate,
      description,
      color,
    };
    if (currentId) {
      eventToSave.id = currentId;
    }
    onSave(eventToSave);
  };

  const handleDelete = () => {
    if (currentId && onDelete) {
      onDelete(currentId);
    }
  };

  const handleEnrichTitle = async () => {
    if (!name.trim()) {
      toast({ title: "Cannot Enrich", description: "Please enter a title first.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      try {
        const combinedStartDate = new Date(`${startDate}T${startTime}`);
        const result = await enrichEventTitle({
          title: name,
          description: description,
          startDate: combinedStartDate,
        });
        if (result.enrichedTitle) {
          setName(result.enrichedTitle);
          toast({ title: "Title Enriched!", description: "AI has suggested a new title." });
        } else {
          toast({ title: "Enrichment Failed", description: "Could not enrich title.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error enriching title:", error);
        toast({ title: "Error", description: "Failed to enrich title due to an error.", variant: "destructive" });
      }
    });
  };
  
  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-[480px] shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {currentId ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-6 py-6 px-2">
            <div className="grid gap-3">
              <Label htmlFor="name" className="text-sm font-medium">Event Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="e.g., Team Meeting"
                  className="flex-grow"
                  required
                />
                <Button type="button" variant="outline" size="icon" onClick={handleEnrichTitle} disabled={isPending || !name.trim()} aria-label="Enrich Title with AI">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="start-time" className="text-sm font-medium">Start Time</Label>
                <Input id="start-time" type="time" value={startTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="end-time" className="text-sm font-medium">End Time</Label>
                <Input id="end-time" type="time" value={endTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)} required />
              </div>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Optional: Add more details about the event"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="color" className="text-sm font-medium">Event Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color-text"
                  type="text"
                  value={color}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  placeholder="e.g., #64B5F6 or blue"
                  className="flex-grow"
                />
                <Input
                  id="color-picker"
                  type="color"
                  value={color.startsWith('#') ? color : '#000000'} // type="color" needs hex
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  className="w-10 h-10 p-0 border-none rounded-md cursor-pointer"
                  aria-label="Choose event color"
                />
              </div>
               <p className="text-xs text-muted-foreground">Enter a hex code (e.g. #BA68C8) or use the color picker.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {currentId && onDelete && (
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the event.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Yes, delete event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="mr-2 h-4 w-4" /> Save Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import type { EventType } from '@/types/event';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

export const mockEvents: EventType[] = [
  {
    id: crypto.randomUUID(),
    name: 'Team Sync Meeting',
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0, 0),
    description: 'Weekly team synchronization meeting to discuss progress and blockers.',
    color: 'hsl(var(--primary))', // Use primary color
  },
  {
    id: crypto.randomUUID(),
    name: 'Client Call: Project Alpha',
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30, 0),
    description: 'Discussion with Client X regarding Project Alpha milestones.',
    color: 'hsl(var(--accent))', // Use accent color
  },
  {
    id: crypto.randomUUID(),
    name: 'Design Review',
    startDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0, 0),
    endDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 30, 0),
    description: 'Internal review of the new UI designs.',
    color: 'hsl(var(--chart-4))', // A distinct color
  },
  {
    id: crypto.randomUUID(),
    name: 'Workshop: Agile Methodologies',
    startDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 0, 0),
    endDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0, 0),
    description: 'Full day workshop on agile development practices.',
    color: 'hsl(var(--chart-2))',
  },
  {
    id: crypto.randomUUID(),
    name: 'Product Launch Planning',
    startDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 10, 0, 0),
    endDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 2, 18, 0, 0), // Multi-day event
    description: 'Intensive planning session for the upcoming product launch.',
    color: 'hsl(var(--destructive))',
  },
  {
    id: crypto.randomUUID(),
    name: 'Generic Meeting',
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0, 0),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0, 0),
    description: 'A standard meeting to discuss various topics.',
    color: 'hsl(var(--secondary))',
  }
];

import { Event as PrismaEvent, RSVP as PrismaRSVP, RVSPStatus } from "@prisma/client";

export type Event = PrismaEvent & {
  user: {
    name: string | null;
    email: string;
  };
  rsvps?: PrismaRSVP[];
  _count?: {
    rsvps: number;
  };
};

export type EventRSVP = PrismaRSVP & {
  event: Event;
  user: {
    name: string | null;
    email: string;
  };
};

export type RSVPStatus = RVSPStatus;
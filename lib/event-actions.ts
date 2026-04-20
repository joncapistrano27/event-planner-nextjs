"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RVSPStatus } from "@prisma/client";

export async function createEvent(_: unknown, formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        eventId: null,
        error: "You must be logged in to create an event",
      };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const date = formData.get("date") as string;
    const location = formData.get("location") as string;
    const maxAttendees = formData.get("maxAttendees") as string;
    const isPublic = formData.get("isPublic") === "on";

    if (!title || !description || !date || !location) {
      return {
        success: false,
        eventId: null,
        error: "All required fields must be filled",
      };
    }

    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return {
        success: false,
        eventId: null,
        error: "Invalid date format",
      };
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: eventDate,
        location,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        isPublic,
        userId: session.user.id,
      },
    });

    revalidatePath("/events");
    revalidatePath("/dashboard");

    return {
      success: true,
      eventId: event.id,
      error: "",
    };
  } catch (error) {
    console.error("Error creating event:", error);
    return {
      success: false,
      eventId: null,
      error: "Failed to create event. Please try again.",
    };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to delete an event",
      };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    if (event.userId !== session.user.id) {
      return {
        success: false,
        error: "You can only delete your own events",
      };
    }

    await prisma.event.delete({
      where: { id: eventId },
    });

    revalidatePath("/events");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting event:", error);
    return {
      success: false,
      error: "Failed to delete event. Please try again.",
    };
  }
}

export async function rsvpToEvent(eventId: string, status: RVSPStatus) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to RSVP",
      };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    // Check if user is trying to RSVP to their own event
    if (event.userId === session.user.id) {
      return {
        success: false,
        error: "You cannot RSVP to your own event",
      };
    }

    // Check max attendees if set
    if (event.maxAttendees && status === "GOING") {
      const goingCount = await prisma.rSVP.count({
        where: {
          eventId,
          status: "GOING",
        },
      });

      if (goingCount >= event.maxAttendees) {
        return {
          success: false,
          error: "Event is at maximum capacity",
        };
      }
    }

    await prisma.rSVP.upsert({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId,
        },
      },
      update: {
        status,
      },
      create: {
        userId: session.user.id,
        eventId,
        status,
      },
    });

    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error RSVPing to event:", error);
    return {
      success: false,
      error: "Failed to update RSVP. Please try again.",
    };
  }
}
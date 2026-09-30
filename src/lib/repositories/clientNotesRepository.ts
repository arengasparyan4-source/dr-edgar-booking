import { randomUUID } from "node:crypto";
import { appRepository } from "@/lib/repositories/appRepository";
import type { ClientNote } from "@/types/domain";

type ClientNoteInput = Pick<ClientNote, "text"> &
  Partial<Pick<ClientNote, "author" | "pinned" | "date">>;

const sortNotes = (notes: ClientNote[]) =>
  [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return `${b.date} ${b.updatedAt}`.localeCompare(`${a.date} ${a.updatedAt}`);
  });

export const clientNotesRepository = {
  async listByClientId(clientId: string) {
    const data = await appRepository.getData();
    return sortNotes(data.clientNotes.filter((note) => note.clientId === clientId));
  },

  async create(clientId: string, input: ClientNoteInput) {
    const now = new Date().toISOString();
    const note: ClientNote = {
      id: `note_${randomUUID()}`,
      clientId,
      text: input.text,
      author: input.author || "admin",
      pinned: Boolean(input.pinned),
      date: input.date || now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    };

    await appRepository.updateData((data) => ({
      ...data,
      clientNotes: [note, ...data.clientNotes]
    }));

    return note;
  },

  async update(clientId: string, noteId: string, patch: Partial<ClientNoteInput>) {
    let updatedNote: ClientNote | null = null;

    await appRepository.updateData((data) => ({
      ...data,
      clientNotes: data.clientNotes.map((note) => {
        if (note.clientId !== clientId || note.id !== noteId) {
          return note;
        }

        updatedNote = {
          ...note,
          ...patch,
          id: note.id,
          clientId: note.clientId,
          text: patch.text ?? note.text,
          pinned: patch.pinned ?? note.pinned,
          date: patch.date ?? note.date,
          author: patch.author ?? note.author,
          createdAt: note.createdAt,
          updatedAt: new Date().toISOString()
        };

        return updatedNote;
      })
    }));

    return updatedNote;
  },

  async delete(clientId: string, noteId: string) {
    let deleted = 0;

    await appRepository.updateData((data) => ({
      ...data,
      clientNotes: data.clientNotes.filter((note) => {
        const shouldDelete = note.clientId === clientId && note.id === noteId;
        if (shouldDelete) {
          deleted += 1;
        }
        return !shouldDelete;
      })
    }));

    return deleted;
  }
};

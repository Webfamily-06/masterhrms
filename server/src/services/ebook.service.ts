import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export interface EbookReadingSession {
  employeeId: string;
  lastPageRead: number;
  progressPercentage: number;
  lastReadAt: string;
}

export interface Ebook {
  id: string;
  tenantId: string;
  title: string;
  author: string;
  category: string;
  description?: string;
  fileUrl: string;
  fileFormat: "PDF" | "EPUB" | "DOCX";
  totalPages: number;
  downloadsCount: number;
  readingSessions: EbookReadingSession[];
  createdAt: string;
  updatedAt: string;
}

export class EbookService {
  private static async getBooks(tenantId: string): Promise<Ebook[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "ebook_library", key: "books" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveBooks(tenantId: string, items: Ebook[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "ebook_library", key: "books" },
    });

    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { items } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "ebook_library",
          key: "books",
          valueType: "JSON",
          valueJson: { items } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * List digital eBooks in tenant library
   */
  static async listBooks(tenantId: string, category?: string): Promise<Ebook[]> {
    let books = await this.getBooks(tenantId);
    if (category && category !== "all") {
      books = books.filter((b) => b.category.toLowerCase() === category.toLowerCase());
    }
    return books;
  }

  /**
   * Get single eBook by ID
   */
  static async getById(tenantId: string, id: string): Promise<Ebook | null> {
    const books = await this.getBooks(tenantId);
    return books.find((b) => b.id === id) || null;
  }

  /**
   * Upload / publish an eBook into the library
   */
  static async createBook(
    tenantId: string,
    data: {
      title: string;
      author: string;
      category: string;
      description?: string;
      fileUrl: string;
      fileFormat?: "PDF" | "EPUB" | "DOCX";
      totalPages: number;
    }
  ): Promise<Ebook> {
    const books = await this.getBooks(tenantId);
    const now = new Date().toISOString();

    const newBook: Ebook = {
      id: `ebook_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      tenantId,
      title: data.title,
      author: data.author,
      category: data.category,
      description: data.description,
      fileUrl: data.fileUrl,
      fileFormat: data.fileFormat || "PDF",
      totalPages: data.totalPages,
      downloadsCount: 0,
      readingSessions: [],
      createdAt: now,
      updatedAt: now,
    };

    books.unshift(newBook);
    await this.saveBooks(tenantId, books);
    return newBook;
  }

  /**
   * Track employee reading progress through eBook
   */
  static async recordProgress(
    tenantId: string,
    bookId: string,
    employeeId: string,
    page: number
  ): Promise<{ book: Ebook; session: EbookReadingSession }> {
    const books = await this.getBooks(tenantId);
    const book = books.find((b) => b.id === bookId);
    if (!book) {
      throw new Error("eBook not found.");
    }

    const validPage = Math.min(book.totalPages, Math.max(1, page));
    const progressPercentage = Math.round((validPage / book.totalPages) * 100);
    const now = new Date().toISOString();

    let session = book.readingSessions.find((s) => s.employeeId === employeeId);
    if (session) {
      session.lastPageRead = validPage;
      session.progressPercentage = progressPercentage;
      session.lastReadAt = now;
    } else {
      session = {
        employeeId,
        lastPageRead: validPage,
        progressPercentage,
        lastReadAt: now,
      };
      book.readingSessions.push(session);
    }

    book.updatedAt = now;
    await this.saveBooks(tenantId, books);
    return { book, session };
  }

  /**
   * Increment download counter
   */
  static async recordDownload(tenantId: string, bookId: string): Promise<Ebook> {
    const books = await this.getBooks(tenantId);
    const book = books.find((b) => b.id === bookId);
    if (!book) {
      throw new Error("eBook not found.");
    }

    book.downloadsCount += 1;
    book.updatedAt = new Date().toISOString();
    await this.saveBooks(tenantId, books);
    return book;
  }

  /**
   * Delete eBook
   */
  static async deleteBook(tenantId: string, id: string): Promise<boolean> {
    let books = await this.getBooks(tenantId);
    const countBefore = books.length;
    books = books.filter((b) => b.id !== id);

    if (books.length === countBefore) {
      throw new Error("eBook not found.");
    }

    await this.saveBooks(tenantId, books);
    return true;
  }
}

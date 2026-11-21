"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EbookService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class EbookService {
    static async getBooks(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "ebook_library", key: "books" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveBooks(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "ebook_library", key: "books" },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: { valueJson: { items }, version: { increment: 1 } },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "ebook_library",
                    key: "books",
                    valueType: "JSON",
                    valueJson: { items },
                    version: 1,
                },
            });
        }
    }
    /**
     * List digital eBooks in tenant library
     */
    static async listBooks(tenantId, category) {
        let books = await this.getBooks(tenantId);
        if (category && category !== "all") {
            books = books.filter((b) => b.category.toLowerCase() === category.toLowerCase());
        }
        return books;
    }
    /**
     * Get single eBook by ID
     */
    static async getById(tenantId, id) {
        const books = await this.getBooks(tenantId);
        return books.find((b) => b.id === id) || null;
    }
    /**
     * Upload / publish an eBook into the library
     */
    static async createBook(tenantId, data) {
        const books = await this.getBooks(tenantId);
        const now = new Date().toISOString();
        const newBook = {
            id: `ebook_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
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
    static async recordProgress(tenantId, bookId, employeeId, page) {
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
        }
        else {
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
    static async recordDownload(tenantId, bookId) {
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
    static async deleteBook(tenantId, id) {
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
exports.EbookService = EbookService;

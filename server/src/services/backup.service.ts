import fs from "fs";
import path from "path";
import zlib from "zlib";
import { spawn } from "child_process";
import { rawPrisma as prisma } from "../prisma";

export interface BackupSnapshotItem {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
  bytes: number;
}

const BACKUP_DIR = path.resolve(__dirname, "../../backups");

function ensureBackupDir(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  }
  return BACKUP_DIR;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function listBackupSnapshots(): BackupSnapshotItem[] {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR);
  const snapshots: BackupSnapshotItem[] = [];

  for (const file of files) {
    if (file.endsWith(".sql") || file.endsWith(".sql.gz")) {
      const fullPath = path.join(BACKUP_DIR, file);
      try {
        const stat = fs.statSync(fullPath);
        snapshots.push({
          id: file,
          name: file,
          size: formatBytes(stat.size),
          bytes: stat.size,
          date: stat.mtime.toLocaleString(),
          type: "Database Snapshot",
        });
      } catch {}
    }
  }

  // Sort latest first
  snapshots.sort((a, b) => b.name.localeCompare(a.name));
  return snapshots;
}

export function getBackupFilePath(filename: string): string | null {
  ensureBackupDir();
  const safeName = path.basename(filename);
  if (safeName !== filename) return null;
  const fullPath = path.join(BACKUP_DIR, safeName);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}

export function deleteBackupSnapshot(filename: string): boolean {
  ensureBackupDir();
  const safeName = path.basename(filename);
  if (safeName !== filename) return false;
  const fullPath = path.join(BACKUP_DIR, safeName);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
}

export async function generateDatabaseBackup(): Promise<BackupSnapshotItem> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseFilename = `master_hrms_backup_${timestamp}.sql.gz`;
  const targetPath = path.join(BACKUP_DIR, baseFilename);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const parsed = new URL(dbUrl);
  const host = parsed.hostname || "127.0.0.1";
  const port = parsed.port || "3306";
  const user = decodeURIComponent(parsed.username || "root");
  const password = decodeURIComponent(parsed.password || "");
  const database = parsed.pathname.replace(/^\//, "");

  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  // Attempt 1: Try native pg_dump (for PostgreSQL/Supabase) or mysqldump
  let generated = false;

  if (isPostgres) {
    try {
      const pgDumpBin = fs.existsSync("/opt/homebrew/bin/pg_dump")
        ? "/opt/homebrew/bin/pg_dump"
        : "pg_dump";

      await new Promise<void>((resolve, reject) => {
        // Use directUrl for dumps if available, otherwise dbUrl
        const dumpUrl = process.env.DIRECT_URL || dbUrl;
        const dumpProc = spawn(
          pgDumpBin,
          [
            `--dbname=${dumpUrl}`,
            "--no-owner",
            "--no-acl",
            "--clean",
            "--if-exists",
          ],
          { stdio: ["ignore", "pipe", "pipe"] }
        );

        const gzip = zlib.createGzip();
        const output = fs.createWriteStream(targetPath);

        dumpProc.stdout.pipe(gzip).pipe(output);

        let stderr = "";
        dumpProc.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });

        dumpProc.on("error", (err) => reject(err));
        output.on("finish", () => {
          if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 100) {
            generated = true;
            resolve();
          } else {
            reject(new Error(`pg_dump produced empty file: ${stderr}`));
          }
        });
        dumpProc.on("close", (code) => {
          if (code !== 0 && !generated) {
            reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
          }
        });
      });
    } catch (err) {
      console.warn("Native pg_dump failed or not available, falling back to Prisma table exporter:", err);
    }
  } else {
    const tempCnfPath = path.join(BACKUP_DIR, `.my.cnf.${Date.now()}`);

    try {
      const cnfContent = `[client]\nhost=${host}\nport=${port}\nuser=${user}\npassword="${password.replace(/"/g, '\\"')}"\n`;
      fs.writeFileSync(tempCnfPath, cnfContent, { mode: 0o600 });

      const mysqldumpBin = fs.existsSync("/opt/homebrew/bin/mysqldump")
        ? "/opt/homebrew/bin/mysqldump"
        : "mysqldump";

      await new Promise<void>((resolve, reject) => {
        const dumpProc = spawn(
          mysqldumpBin,
          [
            `--defaults-extra-file=${tempCnfPath}`,
            "--single-transaction",
            "--quick",
            "--skip-lock-tables",
            database,
          ],
          { stdio: ["ignore", "pipe", "pipe"] }
        );

        const gzip = zlib.createGzip();
        const output = fs.createWriteStream(targetPath);

        dumpProc.stdout.pipe(gzip).pipe(output);

        let stderr = "";
        dumpProc.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });

        dumpProc.on("error", (err) => reject(err));
        output.on("finish", () => {
          if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 100) {
            generated = true;
            resolve();
          } else {
            reject(new Error(`mysqldump produced empty file: ${stderr}`));
          }
        });
        dumpProc.on("close", (code) => {
          if (code !== 0 && !generated) {
            reject(new Error(`mysqldump exited with code ${code}: ${stderr}`));
          }
        });
      });
    } catch (err) {
      console.warn("Native mysqldump failed or not available, falling back to Prisma table exporter:", err);
    } finally {
      if (fs.existsSync(tempCnfPath)) {
        try { fs.unlinkSync(tempCnfPath); } catch {}
      }
    }
  }

  // Attempt 2: Fallback to structured Prisma SQL data dump if native dump failed
  if (!generated) {
    try {
      const gzip = zlib.createGzip();
      const output = fs.createWriteStream(targetPath);
      gzip.pipe(output);

      const header = `-- MASTER HRMS DATABASE BACKUP\n-- Generated at: ${new Date().toISOString()}\n-- Database: ${database}\nSET FOREIGN_KEY_CHECKS=0;\n\n`;
      gzip.write(header);

      const tables: any[] = await prisma.$queryRaw`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ${database} AND TABLE_TYPE = 'BASE TABLE'
      `;

      for (const t of tables) {
        const tableName = t.TABLE_NAME;
        gzip.write(`-- Table: ${tableName}\n`);
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM \`${tableName}\` LIMIT 10000`);
        if (rows.length > 0) {
          for (const row of rows) {
            const cols = Object.keys(row).map((k) => `\`${k}\``).join(", ");
            const vals = Object.values(row)
              .map((v) => {
                if (v === null || v === undefined) return "NULL";
                if (typeof v === "number") return v;
                if (typeof v === "boolean") return v ? 1 : 0;
                if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
                return `'${String(v).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
              })
              .join(", ");
            gzip.write(`INSERT INTO \`${tableName}\` (${cols}) VALUES (${vals});\n`);
          }
        }
        gzip.write("\n");
      }

      gzip.write("SET FOREIGN_KEY_CHECKS=1;\n");
      gzip.end();

      await new Promise<void>((resolve, reject) => {
        output.on("finish", () => resolve());
        output.on("error", reject);
      });
      generated = true;
    } catch (fallbackErr: any) {
      if (fs.existsSync(targetPath)) {
        try { fs.unlinkSync(targetPath); } catch {}
      }
      throw new Error(`Failed to generate database backup: ${fallbackErr.message}`);
    }
  }

  const stat = fs.statSync(targetPath);
  return {
    id: baseFilename,
    name: baseFilename,
    size: formatBytes(stat.size),
    bytes: stat.size,
    date: stat.mtime.toLocaleString(),
    type: "Database Snapshot",
  };
}

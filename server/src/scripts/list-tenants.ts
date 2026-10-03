import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { rawPrisma } from "../prisma";

async function main() {
  const tenants = await rawPrisma.tenant.findMany({
    select: { id: true, name: true, slug: true, createdAt: true },
    take: 20,
    orderBy: { createdAt: "asc" },
  });
  console.log(JSON.stringify(tenants, null, 2));
  await rawPrisma.$disconnect();
}

main().catch(console.error);

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const text = fs.readFileSync('/sessions/vigilant-affectionate-albattani/mnt/outputs/doc.txt', 'utf-8');

  // dev-user-001 (DEV_BYPASS_AUTH)
  const user = await prisma.user.upsert({
    where: { id: 'dev-user-001' },
    update: {},
    create: { id: 'dev-user-001', email: 'dev@rai.local', displayName: 'Dev User' },
  });

  let ws = await prisma.workspace.findFirst({ where: { ownerId: user.id } });
  if (!ws) {
    ws = await prisma.workspace.create({ data: { ownerId: user.id, name: 'RAI Agency' } });
  }

  const updated = await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      brandDocText: text,
      brandDocName: 'RAI_Agency_Sistema_Operativo_Contenido.docx',
      brandDocUpdatedAt: new Date(),
    },
  });

  console.log('Workspace:', updated.id, '| brandDocName:', updated.brandDocName, '| chars:', updated.brandDocText?.length);
}

main().finally(() => prisma.$disconnect());

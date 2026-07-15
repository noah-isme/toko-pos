#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';
import fs from 'fs';
import path from 'path';

// Load environment variables matching Next.js priorities
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const dotenvPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(dotenvPath)) {
      const content = fs.readFileSync(dotenvPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

loadEnv();

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found. Run seed-initial first.');
    process.exit(1);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('NEXTAUTH_SECRET is not set in environment or env files.');
    process.exit(1);
  }

  // Generate NextAuth JWT token
  const token = await encode({
    secret,
    token: {
      sub: user.id,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      role: user.role,
    },
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  console.log('✅ Generated JWT session for user:', user.email);
  console.log('sessionToken:', token);
  console.log('\nSet this cookie in your browser for domain localhost:');
  console.log(`Name: next-auth.session-token`);
  console.log(`Value: ${token}`);
  console.log('Path: /');
  console.log('\nExample curl to call protected endpoint with cookie:');
  console.log(`curl -v --cookie "next-auth.session-token=${token}" "http://localhost:5000/api/trpc/products.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22search%22%3A%22%22%7D%7D%7D"`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

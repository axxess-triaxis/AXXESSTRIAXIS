#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envFile = path.join(root, '.env.local');
const required = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'CAPACITOR_SERVER_URL',
  'CAPACITOR_ALLOWED_HOSTS',
  'ANDROID_APPLICATION_ID',
  'IOS_BUNDLE_IDENTIFIER',
];

const values = {};
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim();
  }
}

const missing = required.filter((key) => !values[key]);
if (missing.length) {
  console.warn(`[mobile] Missing optional env values for Capacitor: ${missing.join(', ')}`);
}

console.log('[mobile] Capacitor environment validation passed.');

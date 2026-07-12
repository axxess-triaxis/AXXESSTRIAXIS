#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const mobileDir = path.join(root, 'apps', 'mobile-capacitor');
const keystorePath = path.join(mobileDir, 'android', 'app', 'release.keystore');
const gradlePropertiesPath = path.join(mobileDir, 'android', 'gradle.properties');

const env = process.env;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

if (env.ANDROID_KEYSTORE_BASE64 && env.ANDROID_KEYSTORE_PASSWORD && env.ANDROID_KEY_ALIAS && env.ANDROID_KEY_PASSWORD) {
  ensureDir(path.dirname(keystorePath));
  const buffer = Buffer.from(env.ANDROID_KEYSTORE_BASE64, 'base64');
  fs.writeFileSync(keystorePath, buffer);
  console.log('[mobile] Wrote Android keystore from base64 secret.');
} else {
  console.log('[mobile] Android keystore secrets not fully supplied; skipping keystore generation.');
}

const props = [
  `android.injected.signing.store.file=${keystorePath}`,
  `android.injected.signing.store.password=${env.ANDROID_KEYSTORE_PASSWORD || ''}`,
  `android.injected.signing.key.alias=${env.ANDROID_KEY_ALIAS || ''}`,
  `android.injected.signing.key.password=${env.ANDROID_KEY_PASSWORD || ''}`,
].join('\n');

fs.writeFileSync(gradlePropertiesPath, props + '\n', { flag: 'w' });
console.log('[mobile] Wrote Android signing properties.');

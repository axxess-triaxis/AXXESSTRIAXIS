#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mobileDir = path.join(root, 'apps', 'mobile-capacitor');
const keystorePath = path.join(mobileDir, 'android', 'app', 'release.keystore');
const gradlePropertiesPath = path.join(mobileDir, 'android', 'gradle.properties');

const env = process.env;
const SIGNING_PROP_PREFIXES = [
  'android.injected.signing.store.file=',
  'android.injected.signing.store.password=',
  'android.injected.signing.key.alias=',
  'android.injected.signing.key.password=',
  'android.useAndroidX=',
  'android.enableJetifier=',
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const hasAndroidSigningSecrets =
  env.ANDROID_KEYSTORE_BASE64 && env.ANDROID_KEYSTORE_PASSWORD && env.ANDROID_KEY_ALIAS && env.ANDROID_KEY_PASSWORD;

if (hasAndroidSigningSecrets) {
  ensureDir(path.dirname(keystorePath));
  const buffer = Buffer.from(env.ANDROID_KEYSTORE_BASE64, 'base64');
  fs.writeFileSync(keystorePath, buffer);
  console.log('[mobile] Wrote Android keystore from base64 secret.');
} else {
  console.log('[mobile] Android keystore secrets not fully supplied; skipping keystore generation.');
}

const props = [
  'android.useAndroidX=true',
  'android.enableJetifier=true',
];

if (hasAndroidSigningSecrets) {
  props.unshift(
    `android.injected.signing.store.file=${keystorePath}`,
    `android.injected.signing.store.password=${env.ANDROID_KEYSTORE_PASSWORD}`,
    `android.injected.signing.key.alias=${env.ANDROID_KEY_ALIAS}`,
    `android.injected.signing.key.password=${env.ANDROID_KEY_PASSWORD}`,
  );
}

ensureDir(path.dirname(gradlePropertiesPath));
let existingProps = [];

try {
  existingProps = fs.readFileSync(gradlePropertiesPath, 'utf8').split(/\r?\n/).filter(Boolean);
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}

const retainedProps = existingProps.filter(
  (line) => !SIGNING_PROP_PREFIXES.some((prefix) => line.startsWith(prefix)),
);
const finalProps = [...retainedProps, ...props].join('\n');

fs.writeFileSync(gradlePropertiesPath, finalProps + '\n', { flag: 'w' });
console.log(`[mobile] Wrote Android ${hasAndroidSigningSecrets ? 'signing and build' : 'build'} properties.`);

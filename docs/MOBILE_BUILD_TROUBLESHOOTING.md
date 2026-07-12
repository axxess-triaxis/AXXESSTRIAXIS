# Mobile Build Troubleshooting

- If Capacitor sync fails, verify the environment variables in .env.local or the GitHub Actions secrets.
- If the web build fails, run pnpm run typecheck and pnpm run build locally first.
- If Android signing fails, confirm the keystore settings and passwords.
- If iOS signing fails, confirm the Apple Developer account, certificates, and provisioning profiles.

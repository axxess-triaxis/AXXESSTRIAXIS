# Webnative Environment Matrix

| Variable | Environment | Client-safe or server-only | GitHub Secret name | Webnative Secret name | Required for Android | Required for iOS | Required for release | Rotation owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NEXT_PUBLIC_APP_URL | development/preview/production | client-safe | NEXT_PUBLIC_APP_URL | NEXT_PUBLIC_APP_URL | Yes | Yes | Yes | Platform engineering |
| NEXT_PUBLIC_SUPABASE_URL | development/preview/production | client-safe | NEXT_PUBLIC_SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL | Yes | Yes | Yes | Platform engineering |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | development/preview/production | client-safe | NEXT_PUBLIC_SUPABASE_ANON_KEY | NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Yes | Yes | Platform engineering |
| NEXT_PUBLIC_ANALYTICS_PROVIDER | development/preview/production | client-safe | NEXT_PUBLIC_ANALYTICS_PROVIDER | NEXT_PUBLIC_ANALYTICS_PROVIDER | Yes | Yes | Yes | Product engineering |
| CAPACITOR_SERVER_URL | development/preview/production | client-safe | CAPACITOR_SERVER_URL | CAPACITOR_SERVER_URL | Yes | Yes | Yes | Platform engineering |
| CAPACITOR_ALLOWED_HOSTS | development/preview/production | client-safe | CAPACITOR_ALLOWED_HOSTS | CAPACITOR_ALLOWED_HOSTS | Yes | Yes | Yes | Platform engineering |
| ANDROID_APPLICATION_ID | production | client-safe | ANDROID_APPLICATION_ID | ANDROID_APPLICATION_ID | Yes | No | Yes | Mobile engineering |
| IOS_BUNDLE_IDENTIFIER | production | client-safe | IOS_BUNDLE_IDENTIFIER | IOS_BUNDLE_IDENTIFIER | No | Yes | Yes | Mobile engineering |
| ANDROID_KEYSTORE_BASE64 | production | server-only | ANDROID_KEYSTORE_BASE64 | ANDROID_KEYSTORE_BASE64 | Yes | No | Yes | Founders / platform engineering |
| ANDROID_KEYSTORE_PASSWORD | production | server-only | ANDROID_KEYSTORE_PASSWORD | ANDROID_KEYSTORE_PASSWORD | Yes | No | Yes | Founders / platform engineering |
| ANDROID_KEY_ALIAS | production | server-only | ANDROID_KEY_ALIAS | ANDROID_KEY_ALIAS | Yes | No | Yes | Founders / platform engineering |
| ANDROID_KEY_PASSWORD | production | server-only | ANDROID_KEY_PASSWORD | ANDROID_KEY_PASSWORD | Yes | No | Yes | Founders / platform engineering |
| ASC_KEY_ID | production | server-only | ASC_KEY_ID | ASC_KEY_ID | No | Yes | Yes | Founders / platform engineering |
| ASC_ISSUER_ID | production | server-only | ASC_ISSUER_ID | ASC_ISSUER_ID | No | Yes | Yes | Founders / platform engineering |
| ASC_PRIVATE_KEY | production | server-only | ASC_PRIVATE_KEY | ASC_PRIVATE_KEY | No | Yes | Yes | Founders / platform engineering |
| APPLE_TEAM_ID | production | server-only | APPLE_TEAM_ID | APPLE_TEAM_ID | No | Yes | Yes | Founders / platform engineering |

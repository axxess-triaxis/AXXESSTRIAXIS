import { Screen } from "../src/components/screen";
import { Text, View } from "react-native";
import { authCapabilityConfig, defaultProductivityPlugins } from "@axxess/shared";

export default function Security() {
  return (
    <Screen title="Security" subtitle="MFA, session, OAuth, and passkey-ready controls.">
      <View style={{ gap: 10 }}>
        <Text style={{ color: "#233238", fontSize: 15, fontWeight: "700" }}>
          2FA: {authCapabilityConfig.twoFactorAuthEnabled ? "Enabled" : "Disabled"}
        </Text>
        <Text style={{ color: "#233238", fontSize: 15, fontWeight: "700" }}>
          OAuth providers: {authCapabilityConfig.oauthProviders.join(", ")}
        </Text>
        <Text style={{ color: "#5F6B73", fontSize: 13 }}>
          Productivity plugins available across web, mobile, and capacitor: {defaultProductivityPlugins.length}
        </Text>
      </View>
    </Screen>
  );
}

import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { MetricCard, Screen } from "../src/components/screen";

export default function Index() {
  return (
    <Screen title="Enterprise beta" subtitle="Mobile access for tenant-aware dashboards, tasks, approvals, knowledge, and AI review workflows.">
      <View style={{ gap: 12 }}>
        <MetricCard label="Beta modules" value="12" />
        <MetricCard label="Security posture" value="MFA-ready" />
      </View>
      <Link href="/login" asChild>
        <Pressable style={{ marginTop: 8, padding: 14, borderRadius: 12, borderCurve: "continuous", backgroundColor: "#8B1E2D" }}>
          <Text style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "800" }}>Sign in</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

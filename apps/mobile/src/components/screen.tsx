import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

export function Screen({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: "#8B1E2D", fontSize: 12, fontWeight: "700", letterSpacing: 0 }}>
          AXXESS TRIAXIS
        </Text>
        <Text selectable style={{ color: "#0F1117", fontSize: 28, fontWeight: "800" }}>{title}</Text>
        <Text selectable style={{ color: "#5F6B73", fontSize: 15, lineHeight: 22 }}>{subtitle}</Text>
      </View>
      {children}
    </ScrollView>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ padding: 16, borderRadius: 12, borderCurve: "continuous", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}>
      <Text selectable style={{ color: "#5F6B73", fontSize: 12, fontWeight: "700" }}>{label}</Text>
      <Text selectable style={{ marginTop: 4, color: "#0F1117", fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

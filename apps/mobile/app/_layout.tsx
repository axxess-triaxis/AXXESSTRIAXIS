import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ headerLargeTitle: true }}>
        <Stack.Screen name="index" options={{ title: "AXXESS" }} />
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="sign-up" options={{ title: "Sign Up" }} />
        <Stack.Screen name="onboarding" options={{ title: "Onboarding" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Stack.Screen name="projects" options={{ title: "Projects" }} />
        <Stack.Screen name="tasks" options={{ title: "Tasks" }} />
        <Stack.Screen name="approvals" options={{ title: "Approvals" }} />
        <Stack.Screen name="knowledge" options={{ title: "Knowledge Hub" }} />
        <Stack.Screen name="ai-workspace" options={{ title: "AI Workspace" }} />
        <Stack.Screen name="documents" options={{ title: "Documents" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="security" options={{ title: "Security" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
        <Stack.Screen name="beta-feedback" options={{ title: "Beta Feedback" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

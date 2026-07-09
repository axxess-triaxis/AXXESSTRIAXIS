import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "../src/components/screen";
import { signInMobile } from "../src/lib/mobile-auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Use Supabase public anon credentials only.");

  async function submit() {
    try {
      await signInMobile(email, password);
      setMessage("Signed in. Continue to dashboard.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  return (
    <Screen title="Login" subtitle="Secure mobile login uses Supabase Auth and device secure storage.">
      <View style={{ gap: 12 }}>
        <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" }} />
        <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" }} />
        <Pressable onPress={() => void submit()} style={{ padding: 14, borderRadius: 12, backgroundColor: "#8B1E2D" }}>
          <Text style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "800" }}>Sign in</Text>
        </Pressable>
        <Text selectable style={{ color: "#5F6B73" }}>{message}</Text>
      </View>
    </Screen>
  );
}

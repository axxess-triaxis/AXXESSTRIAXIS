import { AuthProvider } from "../auth/AuthProvider";
import App from "./App";

export default function WorkspacePage() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

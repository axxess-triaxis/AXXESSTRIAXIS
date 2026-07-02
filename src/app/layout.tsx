import type { Metadata } from "next";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "AXXESS by Triaxis",
  description: "AI-enabled human-in-the-loop institutional intelligence platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

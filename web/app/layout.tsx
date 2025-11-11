import "./globals.css";
import type { Metadata } from "next";
import Header from "../components/Header";

export const metadata: Metadata = {
  title: "OCMT",
  description: "Open CDS Mapping Toolkit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

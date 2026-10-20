import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Bert Labs | People Operations", description: "Bert Labs people operations and employee services." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

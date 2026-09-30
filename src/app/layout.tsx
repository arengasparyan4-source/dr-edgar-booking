import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dr. Edgar",
  description: "Dr. Edgar — կոսմետոլոգ բժիշկ։ Առցանց գրանցում / Онлайн-запись / Online booking."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hy">
      <body>{children}</body>
    </html>
  );
}

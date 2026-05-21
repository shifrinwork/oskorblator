import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ОСКОРБЛЯТОР — Битва Слов",
  description:
    "Соревновательная игра оскорблений. Кто нанесёт самый ебейший удар?",
  openGraph: {
    title: "ОСКОРБЛЯТОР",
    description: "Битва оскорблений в реальном времени",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-[#080808] text-slate-100 min-h-screen">{children}</body>
    </html>
  );
}

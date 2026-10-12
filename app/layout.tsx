import type { Metadata } from "next";
import Navigation from "@/components/navigation";
import "./globals.css";
export const metadata: Metadata = {
  title: "StudyBridge · 영어 학술 읽기",
  description:
    "영어와 한국어를 나란히 읽고 문맥 속 표현을 내 어휘로 저장하세요.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "COGNIX — Think. Connect. Execute.",
  description:
    "The shared intelligence platform connecting SAGA, CLEAR Sys, and ROAMPH.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#080d18", color: "#eef3ff", fontFamily: "Arial, Helvetica, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

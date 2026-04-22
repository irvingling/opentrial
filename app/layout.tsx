import "./globals.css";

export const metadata = {
  title: "OpenTrial",
  description: "Clinical trial search for clinicians",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-white text-gray-900"
        style={{ backgroundColor: "white", color: "#111827" }}
      >
        {children}
      </body>
    </html>
  );
}

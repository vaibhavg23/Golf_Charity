import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BillingProvider } from "@/context/BillingContext";

export const metadata = {
  title: "Digital Heroes - Golf Charity Subscription",
  description: "Track your scores, win monthly rewards, and fund life-changing charity projects.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-dark-bg text-slate-200">
        <a href="#main-content" className="dh-skip-link">Skip to content</a>
        <AuthProvider>
          <BillingProvider>
            {children}
          </BillingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

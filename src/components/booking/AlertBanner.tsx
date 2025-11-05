"use client";

import { Info } from "lucide-react";

type AlertType = "success" | "warning" | "error" | "info";

interface AlertBannerProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
}

const alertStyles = {
  success: {
    container: "bg-[#E7F9ED] border-[#9FFDCC]",
    icon: "text-[#07BB5D]",
    text: "text-[#07BB5D]",
  },
  warning: {
    container: "bg-[#FFF5EA] border-[#FFD699]",
    icon: "text-[#E98E03]",
    text: "text-[#E98E03]",
  },
  error: {
    container: "bg-[#FFE1E1] border-[#FF9393]",
    icon: "text-[#FF0202]",
    text: "text-[#FF0202]",
  },
  info: {
    container: "bg-[#010D50] border-[#010D50]",
    icon: "text-white",
    text: "text-white",
  },
};

export function AlertBanner({ type, title, children }: AlertBannerProps) {
  const styles = alertStyles[type];

  return (
    <div
      className={`${styles.container} border rounded-xl p-2.5 flex items-start gap-2`}
    >
      <Info className={`w-4 h-4 ${styles.icon} shrink-0 mt-0.5`} />
      <div className={`flex flex-col gap-1 text-xs ${styles.text}`}>
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
    </div>
  );
}

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  message = "Loading...",
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8",
        className
      )}
    >
      <Loader2
        className={cn("animate-spin text-[#3754ED]", sizeClasses[size])}
      />
      {message && (
        <p className={cn("text-[#3A478A] font-medium", textSizeClasses[size])}>
          {message}
        </p>
      )}
    </div>
  );
}

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: "default" | "compact";
}

export function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
  className,
  variant = "default",
}: ErrorMessageProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg",
          className
        )}
      >
        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-800 flex-1">{message}</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 px-3"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-8 px-4 bg-white border border-red-200 rounded-xl",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center max-w-md">
        <h3 className="text-lg font-semibold text-[#010D50]">{title}</h3>
        <p className="text-sm text-[#3A478A]">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          className="bg-[#3754ED] hover:bg-[#2942D1] text-white rounded-full px-6 py-2 h-auto text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

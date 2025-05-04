import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  large?: boolean;
};

export function StatusBadge({ status, large = false }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "draft":
        return {
          bgColor: "bg-neutral-light bg-opacity-20",
          textColor: "text-neutral-medium",
          dotColor: "bg-neutral-medium",
          label: "Draft"
        };
      case "underReview":
        return {
          bgColor: "bg-warning bg-opacity-10",
          textColor: "text-warning",
          dotColor: "bg-warning",
          label: "Under Review"
        };
      case "approved":
        return {
          bgColor: "bg-success bg-opacity-10",
          textColor: "text-success",
          dotColor: "bg-success",
          label: "Approved"
        };
      case "rejected":
        return {
          bgColor: "bg-destructive bg-opacity-10",
          textColor: "text-destructive",
          dotColor: "bg-destructive",
          label: "Rejected"
        };
      case "needsRevision":
        return {
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
          dotColor: "bg-blue-600",
          label: "Revisions Requested"
        };
      default:
        return {
          bgColor: "bg-neutral-light bg-opacity-20",
          textColor: "text-neutral-medium",
          dotColor: "bg-neutral-medium",
          label: status
        };
    }
  };

  const { bgColor, textColor, dotColor, label } = getStatusConfig(status);

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        bgColor,
        textColor,
        large ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      )}
    >
      <span 
        className={cn(
          "rounded-full mr-1.5",
          dotColor,
          large ? "w-2 h-2" : "w-1.5 h-1.5"
        )}
      ></span>
      {label}
    </span>
  );
}

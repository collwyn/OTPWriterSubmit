import { FileText, CheckCircle, HourglassIcon, Edit, User } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: number;
  icon: "file-text" | "check-circle" | "hourglass" | "edit" | "user-edit";
  color: "primary" | "success" | "warning" | "muted";
};

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  const getIconConfig = (icon: string, color: string) => {
    const bgColorMap = {
      primary: "bg-primary bg-opacity-10 text-primary",
      success: "bg-success bg-opacity-10 text-success",
      warning: "bg-warning bg-opacity-10 text-warning",
      muted: "bg-neutral-light bg-opacity-20 text-muted-foreground",
    };
    
    const bgColorClass = bgColorMap[color as keyof typeof bgColorMap] || bgColorMap.muted;
    
    return {
      className: `p-3 rounded-full ${bgColorClass}`,
      icon: getIcon(icon),
    };
  };
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "file-text":
        return <FileText className="h-5 w-5" />;
      case "check-circle":
        return <CheckCircle className="h-5 w-5" />;
      case "hourglass":
        return <HourglassIcon className="h-5 w-5" />;
      case "edit":
        return <Edit className="h-5 w-5" />;
      case "user-edit":
        return <User className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };
  
  const { className, icon: IconComponent } = getIconConfig(icon, color);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center">
        <div className={className}>
          {IconComponent}
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-neutral-dark">{value}</h3>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
    </div>
  );
}

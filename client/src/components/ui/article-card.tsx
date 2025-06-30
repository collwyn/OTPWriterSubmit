import { Article } from "@shared/schema";
import { StatusBadge } from "@/components/ui/status-badge";
import { CalendarDays, Clock, FileText, Eye, Edit, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ArticleCardProps = {
  article: Article;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function ArticleCard({ article, onView, onEdit, onDelete }: ArticleCardProps) {
  const { user } = useAuth();
  // Function to handle downloading article
  const handleDownload = async () => {
    try {
      // Start download by opening a new window/tab with the download URL
      window.open(`/api/articles/${article.id}/download`, '_blank');
      
      toast({
        title: "Download started",
        description: "Your download should begin automatically",
      });
    } catch (error) {
      console.error("Error downloading article:", error);
      toast({
        title: "Download failed",
        description: "There was a problem downloading the article",
        variant: "destructive",
      });
    }
  };

  // Determine if we can show download button (approved articles only)
  const showDownloadButton = article.status === "approved";
  
  return (
    <div className="p-4 sm:p-6 hover:bg-neutral-lightest transition duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-grow mb-4 sm:mb-0">
          <div className="flex items-start">
            <div className="flex-shrink-0 hidden sm:block">
              {article.featuredImage ? (
                <img 
                  className="h-16 w-16 rounded object-cover" 
                  src={`/uploads/${article.featuredImage}`} 
                  alt="Article thumbnail" 
                />
              ) : (
                <div className="h-16 w-16 rounded bg-neutral-lightest flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="sm:ml-4">
              <h3 className="text-lg font-semibold text-neutral-dark">{article.title}</h3>
              <div className="mt-1 flex flex-wrap items-center text-sm text-muted-foreground gap-2 sm:gap-3">
                <span className="flex items-center">
                  <CalendarDays className="mr-1 h-4 w-4" />
                  Submitted: {format(new Date(article.createdAt), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  Last updated: {format(new Date(article.updatedAt), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center">
                  <FileText className="mr-1 h-4 w-4" />
                  {article.wordCount || 0} words
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <StatusBadge status={article.status} />
          <div className="flex ml-3">
            {/* Download button for approved articles */}
            {showDownloadButton && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDownload} 
                className="text-muted-foreground hover:text-green-600"
                title="Download article and images"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {/* Edit button */}
            {onEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onEdit} 
                className="text-muted-foreground hover:text-primary ml-2"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            {/* View button */}
            {onView && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onView} 
                className="text-muted-foreground hover:text-primary ml-2"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            
            {/* Delete button - only for admins */}
            {user?.isAdmin && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-red-600 ml-2"
                    title="Delete Article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Article</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{article.title}"? This action cannot be undone.
                      All associated files will also be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

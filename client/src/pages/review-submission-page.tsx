import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Article, User } from "@shared/schema";
import { ArrowLeft, Calendar, Clock, FileText, ThumbsUp, ThumbsDown, MessageSquare, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

type ArticleWithAuthor = Article & {
  author?: { 
    id: number;
    username: string;
    email: string;
  } | null;
};

type ReviewSubmissionPageProps = {
  id?: string;
};

export default function ReviewSubmissionPage({ id: propId }: ReviewSubmissionPageProps = {}) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");

  // Get article ID from props or URL params
  const articleId = propId || params.id;

  console.log(`ReviewSubmissionPage: Path ${location}, Attempting to load article ID:`, articleId);

  // We need to ensure we're making a direct request to the server
  const articleUrl = `/api/articles/${articleId}`;

  useEffect(() => {
    if (!user) {
      // If not authenticated, redirect to login
      navigate('/auth');
    }
  }, [user, navigate]);

  // Fetch article (only if user is authenticated)
  const { data: article, isLoading: isLoadingArticle, error: articleError } = useQuery<ArticleWithAuthor>({
    queryKey: [articleUrl],
    enabled: !!articleId && !!user,
  });

  // Log article data when it changes
  useEffect(() => {
    if (article) {
      console.log(`ReviewSubmissionPage: Article ${article.id} loaded:`, {
        id: article.id,
        title: article.title,
        contentLength: article.content?.length || 0
      });
    }
  }, [article]);

  // Update article status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, feedback }: { status: string, feedback?: string }) => {
      const res = await apiRequest("PATCH", `/api/articles/${articleId}`, { 
        status,
        ...(feedback ? { feedback } : {})
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      queryClient.invalidateQueries({ queryKey: [articleUrl] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });

      toast({
        title: "Article status updated",
        description: "The article status has been successfully updated.",
      });

      navigate('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/articles/${articleId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Article deleted",
        description: "The article has been permanently deleted.",
      });
      navigate('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle approve/reject action
  const handleUpdateStatus = (status: string) => {
    updateStatusMutation.mutate({ 
      status, 
      feedback: feedback.trim() ? feedback : undefined 
    });
  };

  // Function to handle downloading article
  const handleDownload = async () => {
    try {
      // Start download by opening a new window/tab with the download URL
      window.open(`/api/articles/${articleId}/download`, '_blank');

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

  return (
    <div className="min-h-screen flex flex-col bg-neutral-lightest">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button 
              onClick={() => navigate('/')} 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>

          {articleError ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
              <h2 className="text-xl font-medium text-red-700 mb-2">Error Loading Article</h2>
              <p className="text-red-600">
                {articleError instanceof Error ? articleError.message : "An unknown error occurred"}
              </p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-4 bg-red-600 hover:bg-red-700"
              >
                Return to Dashboard
              </Button>
            </div>
          ) : isLoadingArticle ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-32" />
              </div>

              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : article ? (
            <>
              <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-2xl font-display font-bold text-neutral-dark mb-2">{article.title}</h2>
                  <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-3">
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      Submitted: {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      Last updated: {new Date(article.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <FileText className="mr-1 h-4 w-4" />
                      {article.wordCount || 0} words
                    </span>
                  </div>
                </div>

                <StatusBadge status={article.status} large />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-6">
                      <h3 className="font-medium text-lg mb-4">Article Content</h3>

                  {((article.images && JSON.parse(article.images).length > 0) || article.featuredImage) && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-neutral-dark mb-3">
                        Images {article.images && `(${JSON.parse(article.images).length})`}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {article.images ? (
                          JSON.parse(article.images).map((image: string, index: number) => (
                            <div key={index} className="relative">
                              <img 
                                src={`/uploads/${image}`} 
                                alt={`Image ${index + 1}`} 
                                className="w-full h-48 object-cover rounded-lg shadow-sm border border-neutral-light"
                              />
                              {index === 0 && (
                                <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                                  Featured
                                </div>
                              )}
                            </div>
                          ))
                        ) : article.featuredImage ? (
                          <img 
                            src={`/uploads/${article.featuredImage}`} 
                            alt="Featured image" 
                            className="w-full h-48 object-cover rounded-lg shadow-sm border border-neutral-light"
                          />
                        ) : null}
                      </div>
                    </div>
                  )}

                      <div className="prose max-w-none">
                        {/* Debug info */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="mb-3 text-xs text-muted-foreground">
                            Content type: {typeof article.content}<br />
                            Property exists: {'content' in article ? 'Yes' : 'No'}<br />
                            Content length: {String(article.content || '').length}
                          </div>
                        )}

                        {(() => {
                          // Explicitly extract content safely from the article
                          let contentStr = "";

                          // Extract content directly from the article
                          if (article && typeof article === 'object' && article.content !== undefined) {
                            contentStr = String(article.content || '');
                          }

                          // Process content for display
                          const contentTrimmed = contentStr.trim();
                          const paragraphs = contentTrimmed.split('\n')
                            .map(p => p.trim())
                            .filter(p => p.length > 0);

                          console.log(`Processing content for article ID ${articleId}`, { 
                            contentLength: contentStr.length,
                            paragraphCount: paragraphs.length
                          });

                          if (paragraphs.length === 0) {
                            return <p className="text-muted-foreground">No content available.</p>;
                          }

                          return paragraphs.map((paragraph, i) => (
                            <p key={i} className="mb-4">{paragraph}</p>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-6">
                      <h3 className="font-medium text-lg mb-4">Article Details</h3>

                      {/* Download button for approved articles */}
                      {article.status === "approved" && (
                        <div className="mb-4">
                          <Button 
                            onClick={handleDownload} 
                            className="bg-green-600 hover:bg-green-700 flex items-center"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Article Package
                          </Button>
                        </div>
                      )}

                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm text-muted-foreground">Author</dt>
                          <dd className="text-neutral-dark mt-1 font-medium">
                            {article.author?.username || 'Unknown'}
                          </dd>
                          {article.author?.email && (
                            <dd className="text-sm text-muted-foreground">
                              {article.author.email}
                            </dd>
                          )}
                        </div>

                        <div>
                          <dt className="text-sm text-muted-foreground">Category</dt>
                          <dd className="text-neutral-dark mt-1">
                            {article.category === 'local' && 'Local News'}
                            {article.category === 'business' && 'Business'}
                            {article.category === 'technology' && 'Technology'}
                            {article.category === 'arts' && 'Arts & Culture'}
                            {article.category === 'sports' && 'Sports'}
                            {article.category === 'opinion' && 'Opinion'}
                            {article.category === 'lifestyle' && 'Lifestyle'}
                            {article.category === 'newsletter' && 'Newsletter'}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-sm text-muted-foreground">Target Audience</dt>
                          <dd className="text-neutral-dark mt-1">
                            {article.targetAudience === 'general' && 'General Audience'}
                            {article.targetAudience === 'specialized' && 'Specialized/Subject Matter Experts'}
                            {article.targetAudience === 'youth' && 'Young Adults'}
                            {article.targetAudience === 'business' && 'Business Professionals'}
                            {!article.targetAudience && 'Not specified'}
                          </dd>
                        </div>

                        {article.keywords && article.keywords.trim() && (
                          <div>
                            <dt className="text-sm text-muted-foreground">Keywords</dt>
                            <dd className="flex flex-wrap gap-2 mt-1">
                              {article.keywords.split(',').filter(k => k.trim()).map((keyword, i) => (
                                <span 
                                  key={i} 
                                  className="bg-neutral-lightest text-neutral-dark text-xs px-2 py-1 rounded-full"
                                >
                                  {keyword.trim()}
                                </span>
                              ))}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  {user?.isAdmin && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="p-6">
                        <h3 className="font-medium text-lg mb-4">Admin Actions</h3>

                        <div className="space-y-4">
                          <Textarea
                            placeholder="Add feedback or notes for the writer..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="resize-none"
                            rows={4}
                          />

                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Change article status:</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button 
                                onClick={() => handleUpdateStatus('approved')}
                                className="bg-green-600 hover:bg-green-700 flex items-center"
                                disabled={updateStatusMutation.isPending}
                              >
                                <ThumbsUp className="mr-2 h-4 w-4" />
                                Approve
                              </Button>

                              <Button 
                                onClick={() => handleUpdateStatus('rejected')}
                                className="bg-red-600 hover:bg-red-700 flex items-center"
                                disabled={updateStatusMutation.isPending}
                              >
                                <ThumbsDown className="mr-2 h-4 w-4" />
                                Reject
                              </Button>

                              <Button 
                                onClick={() => handleUpdateStatus('needsRevision')}
                                className="bg-blue-600 hover:bg-blue-700 flex items-center"
                                disabled={updateStatusMutation.isPending}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Request Revisions
                              </Button>
                            </div>
                          </div>

                          <Separator />

                          {/* Delete Article Section */}
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Danger Zone:</p>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive"
                                  className="flex items-center"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Article
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Article</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to permanently delete "{article?.title}"? 
                                    This action cannot be undone and will also delete all associated files.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteArticleMutation.mutate()}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={deleteArticleMutation.isPending}
                                  >
                                    {deleteArticleMutation.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-xl font-medium text-neutral-dark">Article not found</h2>
              <p className="text-muted-foreground mt-2">
                The article you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-4"
              >
                Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
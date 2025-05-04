import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Article, User } from "@shared/schema";
import { ArrowLeft, Calendar, Clock, FileText, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ArticleWithAuthor = Article & {
  author?: { 
    id: number;
    username: string;
    email: string;
  } | null;
};

export default function ReviewSubmissionPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  
  // Get article ID from URL params
  const articleId = params.id;
  
  console.log("ReviewSubmissionPage: Attempting to load article ID:", articleId);

  // Fetch article
  const { data: article, isLoading: isLoadingArticle, error: articleError } = useQuery<ArticleWithAuthor>({
    queryKey: ['/api/articles', articleId],
    enabled: !!articleId,
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/articles', articleId] });
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

  // Handle approve/reject action
  const handleUpdateStatus = (status: string) => {
    updateStatusMutation.mutate({ 
      status, 
      feedback: feedback.trim() ? feedback : undefined 
    });
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
                      
                      {article.featuredImage && (
                        <div className="mb-6">
                          <img 
                            src={`/uploads/${article.featuredImage}`} 
                            alt="Featured" 
                            className="w-full h-64 object-cover rounded-md mb-2" 
                          />
                          <p className="text-xs text-muted-foreground">Featured image</p>
                        </div>
                      )}
                      
                      <div className="prose max-w-none">
                        {article.content && article.content.split('\n').map((paragraph, i) => (
                          <p key={i} className="mb-4">{paragraph}</p>
                        ))}
                        {!article.content && <p className="text-muted-foreground">No content available.</p>}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-6">
                      <h3 className="font-medium text-lg mb-4">Article Details</h3>
                      
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

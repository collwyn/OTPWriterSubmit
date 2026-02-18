import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/ui/article-card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Article } from "@shared/schema";
import { Filter, SortDesc, Plus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch user articles
  const { data: articles, isLoading: isLoadingArticles, refetch: refetchArticles } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
    retry: 1,
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery<{
    total: number;
    draft: number;
    underReview: number;
    approved: number;
    rejected: number;
  }>({
    queryKey: ["/api/stats"],
    retry: 1,
  });

  // Effect to refetch data when component mounts or filters change
  useEffect(() => {
    refetchArticles();
    refetchStats();
  }, [refetchArticles, refetchStats]);

  // Filter articles based on search and filters
  const filteredArticles = articles ? articles.filter(article => {
    // Search term filter
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    
    // Status filter
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) : [];

  console.log("Dashboard Articles:", {
    total: articles?.length,
    filtered: filteredArticles.length,
    first: articles?.[0] ? { id: articles[0].id, title: articles[0].title } : null
  });

  return (
    <div className="min-h-screen flex flex-col bg-neutral-lightest">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-neutral-dark mb-2">Your Stories</h2>
            <p className="text-muted-foreground">Manage your submissions and track their status</p>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex space-x-2 mb-4 sm:mb-0">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-white border hover:border-primary w-36">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="local">Local News</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="arts">Arts & Culture</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="opinion">Opinion</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border hover:border-primary w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="underReview">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search stories..."
                  className="pl-9 border hover:border-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => navigate("/submit")}
                className="bg-secondary hover:bg-secondary/90 flex-shrink-0"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Submit New Story</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-neutral-light">
              {isLoadingArticles ? (
                // Loading skeletons
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-6">
                    <div className="flex items-center">
                      <Skeleton className="h-16 w-16 rounded" />
                      <div className="ml-4 space-y-2 flex-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ))
              ) : filteredArticles.length > 0 ? (
                filteredArticles.map((article) => {
                  console.log("Dashboard rendering article:", {
                    id: article.id,
                    title: article.title,
                    url: `/submissions/${article.id}`
                  });
                  return (
                    <ArticleCard 
                      key={article.id} 
                      article={article}
                      onView={() => {
                        const url = `/submissions/${article.id}`;
                        console.log(`Navigating to article ${article.id}: ${url}`);
                        navigate(url);
                      }}
                      onEdit={() => navigate(`/submit?id=${article.id}`)}
                    />
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {articles && articles.length > 0 
                      ? "No articles match your filters"
                      : "You haven't submitted any stories yet"}
                  </p>
                  <Button 
                    onClick={() => navigate("/submit")} 
                    className="mt-4 bg-primary hover:bg-primary/90"
                  >
                    Submit Your First Story
                  </Button>
                </div>
              )}
            </div>
            
            {filteredArticles.length > 0 && (
              <div className="px-6 py-4 bg-neutral-lightest border-t border-neutral-light">
                <div className="flex flex-col sm:flex-row items-center justify-between">
                  <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
                    Showing {filteredArticles.length} of {articles?.length || 0} stories
                  </div>
                  {/* Pagination can be implemented here if needed */}
                </div>
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-display font-bold text-neutral-dark mb-6">Quick Stats</h2>
            {isLoadingStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                  title="Total Stories" 
                  value={stats?.total || 0}
                  icon="file-text"
                  color="primary"
                />
                <StatsCard 
                  title="Published" 
                  value={stats?.approved || 0}
                  icon="check-circle"
                  color="success"
                />
                <StatsCard 
                  title="Under Review" 
                  value={stats?.underReview || 0}
                  icon="hourglass"
                  color="warning"
                />
                <StatsCard 
                  title="Drafts" 
                  value={stats?.draft || 0}
                  icon="edit"
                  color="muted"
                />
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

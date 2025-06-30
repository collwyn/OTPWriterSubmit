import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Article, User } from "@shared/schema";
import { Eye, Edit, MoreVertical, Search, Clock, CheckCircle, UserPlus, Mail, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type ActivityItem = {
  id: number;
  type: 'submission' | 'approval' | 'revision' | 'registration';
  content: string;
  date: Date;
  user: {
    name: string;
    role?: string;
  };
  article?: {
    title: string;
  };
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all articles
  const { data: articles, isLoading: isLoadingArticles } = useQuery<ArticleWithAuthor[]>({
    queryKey: ["/api/articles"],
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (articleId: number) => {
      const res = await apiRequest("DELETE", `/api/articles/${articleId}`);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch articles and stats
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Article deleted",
        description: "The article has been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter articles based on search and filters
  const filteredArticles = articles ? articles.filter(article => {
    // Search term filter
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.author?.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.author?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    
    // Status filter
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) : [];

  // Mock recent activity data - in a real app this would come from an API
  const recentActivity: ActivityItem[] = [
    {
      id: 1,
      type: 'submission',
      content: 'New submission from Sarah Johnson',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      user: { name: 'Sarah Johnson' },
      article: { title: 'The Rising Tide: Climate Change\'s Impact on Coastal Communities' }
    },
    {
      id: 2,
      type: 'approval',
      content: 'Story approved by Editor David',
      date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      user: { name: 'David Smith', role: 'Editor' },
      article: { title: 'Local Startup\'s Revolutionary Approach to Sustainable Agriculture' }
    },
    {
      id: 3,
      type: 'revision',
      content: 'Revisions requested by Editor Jessica',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      user: { name: 'Jessica Lee', role: 'Editor' },
      article: { title: 'The Future of Remote Work Post-Pandemic' }
    },
    {
      id: 4,
      type: 'registration',
      content: 'New writer registered',
      date: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      user: { name: 'Emma Rodriguez' }
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-lightest">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-neutral-dark mb-2">Admin Dashboard</h2>
            <p className="text-muted-foreground">Manage all writer submissions and publications</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {isLoadingStats ? (
              Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : (
              <>
                <StatsCard 
                  title="Total Submissions" 
                  value={stats?.total || 0}
                  icon="file-text"
                  color="primary"
                />
                <StatsCard 
                  title="Pending Review" 
                  value={stats?.underReview || 0}
                  icon="hourglass"
                  color="warning"
                />
                <StatsCard 
                  title="Approved" 
                  value={stats?.approved || 0}
                  icon="check-circle"
                  color="success"
                />
                <StatsCard 
                  title="Active Writers" 
                  value={articles?.reduce((acc: Set<number>, article) => {
                    if (article.author?.id) {
                      acc.add(article.author.id);
                    }
                    return acc;
                  }, new Set()).size || 0}
                  icon="user-edit"
                  color="muted"
                />
              </>
            )}
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
            
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search submissions..."
                className="pl-9 w-full sm:w-64 border hover:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-lightest">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Writer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingArticles ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center">
                            <Skeleton className="h-10 w-10 rounded" />
                            <div className="ml-4 space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredArticles.length > 0 ? (
                    filteredArticles.map((article) => (
                      <TableRow key={article.id} className="hover:bg-neutral-lightest">
                        <TableCell>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {article.featuredImage ? (
                                <img 
                                  src={`/uploads/${article.featuredImage}`} 
                                  alt="" 
                                  className="h-10 w-10 rounded object-cover" 
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-neutral-lightest flex items-center justify-center">
                                  <Filter className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-neutral-dark line-clamp-1">
                                {article.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {article.wordCount} words
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-neutral-dark">
                            {article.author?.username || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {article.author?.email || 'No email'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-neutral-dark">
                            {article.category === 'local' && 'Local News'}
                            {article.category === 'business' && 'Business'}
                            {article.category === 'technology' && 'Technology'}
                            {article.category === 'arts' && 'Arts & Culture'}
                            {article.category === 'sports' && 'Sports'}
                            {article.category === 'opinion' && 'Opinion'}
                            {article.category === 'lifestyle' && 'Lifestyle'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-neutral-dark">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={article.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Button 
                              variant="link" 
                              className="text-primary hover:text-primary/80 p-0 h-auto"
                              onClick={() => navigate(`/submissions/${article.id}`)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="link" 
                              className="text-primary hover:text-primary/80 p-0 h-auto"
                              onClick={() => navigate(`/submit?id=${article.id}`)}
                            >
                              Edit
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                  // Approve article functionality
                                }}>
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Request revisions functionality
                                }}>
                                  Request Revisions
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Reject article functionality
                                }}>
                                  Reject
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Article
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Article</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to permanently delete "{article.title}"? 
                                        This action cannot be undone and will also delete all associated files.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteArticleMutation.mutate(article.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={deleteArticleMutation.isPending}
                                      >
                                        {deleteArticleMutation.isPending ? "Deleting..." : "Delete"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">
                          {articles && articles.length > 0 
                            ? "No articles match your filters"
                            : "No submissions yet"}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {filteredArticles.length > 0 && (
              <div className="px-6 py-4 bg-neutral-lightest border-t border-neutral-light">
                <div className="flex flex-col sm:flex-row items-center justify-between">
                  <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
                    Showing {filteredArticles.length} of {articles?.length || 0} submissions
                  </div>
                  {/* Pagination would go here */}
                </div>
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-display font-bold text-neutral-dark mb-6">Recent Activity</h2>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="divide-y divide-neutral-light">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-neutral-lightest">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center text-primary">
                          {activity.type === 'submission' && <Mail className="h-5 w-5" />}
                          {activity.type === 'approval' && <CheckCircle className="h-5 w-5" />}
                          {activity.type === 'revision' && <Edit className="h-5 w-5" />}
                          {activity.type === 'registration' && <UserPlus className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-dark">{activity.content}</div>
                        {activity.article && (
                          <div className="text-sm text-muted-foreground mt-1">{activity.article.title}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {activity.date.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="px-4 py-3 bg-neutral-lightest border-t border-neutral-light text-center">
                <Button variant="link" className="text-primary hover:text-primary/80">
                  View All Activity
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

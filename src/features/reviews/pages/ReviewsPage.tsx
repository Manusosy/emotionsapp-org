import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/authContext';
import DashboardLayout from '@/features/dashboard/components/DashboardLayout';
import { reviewsService } from '@/services';
import { ReviewFilters } from '../components/ReviewFilters';
import { ReviewsTable } from '../components/ReviewsTable';
import { ReviewDetailsDialog } from '../components/ReviewDetailsDialog';
import { ReviewsAnalytics } from '../components/ReviewsAnalytics';
import { Review, ReviewFilter, ReviewStats } from '../types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Star, Download, Upload, BarChart2, Mail, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReviewsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>({
    status: 'all',
    rating: 'all',
    dateRange: null,
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    statusDistribution: {
      pending: 0,
      published: 0,
      rejected: 0,
      flagged: 0,
    },
    pendingCount: 0,
    publishedCount: 0,
    rejectedCount: 0,
    flaggedCount: 0,
    reviewsOverTime: [],
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Define fetchReviews and fetchStats before using them
  const fetchReviews = async () => {
    try {
      setIsLoading(true);

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Modify filter based on active tab
      const tabFilter = { ...filter };
      if (activeTab !== 'all') {
        tabFilter.status = activeTab as ReviewFilter['status'];
      }

      const { success, data, error } = await reviewsService.getReviews(user.id, tabFilter);

      if (!success || !data) {
        throw new Error(error || 'Failed to fetch reviews');
      }

      setReviews(data);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      toast.error(error.message || 'Failed to load reviews');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setIsStatsLoading(true);

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.getReviewStats(user.id);

      if (!success || !data) {
        throw new Error(error || 'Failed to fetch review stats');
      }

      setStats(data);
    } catch (error: any) {
      console.error('Error fetching review stats:', error);
      toast.error(error.message || 'Failed to load review statistics');
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Load reviews on component mount and when filters change
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!user) {
          setError('Please sign in to view reviews');
          return;
        }

        const userRole = user.user_metadata?.role;
        if (userRole !== 'mood_mentor') {
          setError('Only mentors can access the reviews dashboard');
          return;
        }

        await Promise.all([
          fetchReviews(),
          fetchStats()
        ]);
      } catch (error: any) {
        console.error('Error in reviews page:', error);
        setError(error.message || 'An error occurred while loading the reviews dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndFetchData();
  }, [user, filter, activeTab]);

  // If there's an error, show error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {error === 'Please sign in to view reviews' ? (
              <>
                Please <Link to="/mentor-signin" className="text-blue-600 hover:underline">sign in</Link> to access the reviews dashboard.
              </>
            ) : (
              'If you believe this is an error, please contact support.'
            )}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update filter based on tab
    if (value === 'all') {
      setFilter({ ...filter, status: 'all' });
    } else {
      setFilter({ ...filter, status: value as ReviewFilter['status'] });
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilter: ReviewFilter) => {
    setFilter(newFilter);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilter({
      status: activeTab === 'all' ? 'all' : (activeTab as ReviewFilter['status']),
      rating: 'all',
      dateRange: null,
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  // Handle review selection
  const handleViewReview = async (reviewId: string) => {
    try {
      const { success, data, error } = await reviewsService.getReviewById(reviewId);

      if (!success || !data) {
        throw new Error(error || 'Failed to fetch review details');
      }

      setSelectedReview(data);
      setIsDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching review details:', error);
      toast.error(error.message || 'Failed to load review details');
    }
  };

  // Handle review status change
  const handleStatusChange = async (reviewId: string, status: 'published' | 'rejected' | 'flagged') => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.updateReviewStatus(
        reviewId,
        user.id,
        status
      );

      if (!success || !data) {
        throw new Error(error || `Failed to ${status} review`);
      }

      // Update the reviews list and selected review
      setReviews(reviews.map(review => 
        review.id === reviewId ? data : review
      ));
      setSelectedReview(data);

      // Update stats
      fetchStats();
      
      return Promise.resolve();
    } catch (error: any) {
      console.error(`Error updating review status to ${status}:`, error);
      toast.error(error.message || `Failed to ${status} review`);
      return Promise.reject(error);
    }
  };

  // Handle review approval
  const handleApproveReview = async (reviewId: string) => {
    await handleStatusChange(reviewId, 'published');
  };

  // Handle review rejection
  const handleRejectReview = async (reviewId: string) => {
    await handleStatusChange(reviewId, 'rejected');
  };

  // Handle review flagging
  const handleFlagReview = async (reviewId: string) => {
    await handleStatusChange(reviewId, 'flagged');
  };

  // Handle responding to a review
  const handleRespondToReview = (reviewId: string) => {
    handleViewReview(reviewId);
    // The dialog will handle the response submission
  };

  // Handle response submission
  const handleResponseSubmit = async (reviewId: string, content: string, isPublished: boolean) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.respondToReview(
        reviewId,
        user.id,
        content,
        isPublished
      );

      if (!success || !data) {
        throw new Error(error || 'Failed to submit response');
      }

      // Update the selected review with the new response
      if (selectedReview && selectedReview.id === reviewId) {
        setSelectedReview({
          ...selectedReview,
          response: data,
        });
      }

      return Promise.resolve();
    } catch (error: any) {
      console.error('Error responding to review:', error);
      toast.error(error.message || 'Failed to submit response');
      return Promise.reject(error);
    }
  };

  // Handle response deletion
  const handleResponseDelete = async (responseId: string) => {
    try {
      if (!user || !selectedReview) {
        throw new Error('User not authenticated or no review selected');
      }

      const { success, error } = await reviewsService.deleteReviewResponse(
        responseId,
        user.id
      );

      if (!success) {
        throw new Error(error || 'Failed to delete response');
      }

      // Update the selected review
      setSelectedReview({
        ...selectedReview,
        response: null,
      });

      return Promise.resolve();
    } catch (error: any) {
      console.error('Error deleting response:', error);
      toast.error(error.message || 'Failed to delete response');
      return Promise.reject(error);
    }
  };

  // Handle note submission
  const handleNotesSubmit = async (reviewId: string, content: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.addReviewNote(
        reviewId,
        user.id,
        content
      );

      if (!success || !data) {
        throw new Error(error || 'Failed to add note');
      }

      // Update the selected review with the new note
      if (selectedReview && selectedReview.id === reviewId) {
        setSelectedReview({
          ...selectedReview,
          notes: [...(selectedReview.notes || []), data],
        });
      }

      return Promise.resolve();
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error.message || 'Failed to add note');
      return Promise.reject(error);
    }
  };

  // Handle note update
  const handleNotesUpdate = async (noteId: string, content: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.updateReviewNote(
        noteId,
        user.id,
        content
      );

      if (!success || !data) {
        throw new Error(error || 'Failed to update note');
      }

      // Update the selected review with the updated note
      if (selectedReview) {
        setSelectedReview({
          ...selectedReview,
          notes: selectedReview.notes
            ? selectedReview.notes.map(note => (note.id === noteId ? data : note))
            : [],
        });
      }

      return Promise.resolve();
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast.error(error.message || 'Failed to update note');
      return Promise.reject(error);
    }
  };

  // Handle export reviews
  const handleExportReviews = async (format: 'csv' | 'pdf') => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { success, data, error } = await reviewsService.exportReviews(
        user.id,
        filter,
        format
      );

      if (!success) {
        throw new Error(error || `Failed to export reviews as ${format.toUpperCase()}`);
      }

      if (!data) {
        toast.error('No reviews available to export');
        setIsExportDialogOpen(false);
        return;
      }

      // Create a download link
      const link = document.createElement('a');
      link.href = data;
      link.download = `reviews-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      setTimeout(() => {
        URL.revokeObjectURL(data);
      }, 1000);

      toast.success(`Reviews exported as ${format.toUpperCase()}`);
      setIsExportDialogOpen(false);
    } catch (error: any) {
      console.error(`Error exporting reviews as ${format}:`, error);
      toast.error(error.message || `Failed to export reviews as ${format.toUpperCase()}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
            <p className="text-muted-foreground">
              Manage and respond to client reviews and testimonials
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsRequestDialogOpen(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Request Reviews
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <ReviewsAnalytics stats={stats} isLoading={isStatsLoading} />

        {/* Reviews Table with Filtering */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Client Reviews</CardTitle>
            <CardDescription>
              View and manage feedback from your clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter Section */}
            <ReviewFilters
              filter={filter}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-5 w-full sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({stats.pendingCount})
                </TabsTrigger>
                <TabsTrigger value="published">
                  Published ({stats.publishedCount})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({stats.rejectedCount})
                </TabsTrigger>
                <TabsTrigger value="flagged">
                  Flagged ({stats.flaggedCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="pt-4">
                <ReviewsTable
                  reviews={reviews}
                  isLoading={isLoading}
                  onViewReview={handleViewReview}
                  onApproveReview={handleApproveReview}
                  onRejectReview={handleRejectReview}
                  onFlagReview={handleFlagReview}
                  onRespondToReview={handleRespondToReview}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Review Detail Dialog */}
        <ReviewDetailsDialog
          review={selectedReview}
          isOpen={isDialogOpen}
          isLoading={false}
          onClose={() => setIsDialogOpen(false)}
          onStatusChange={handleStatusChange}
          onResponseSubmit={handleResponseSubmit}
          onResponseDelete={handleResponseDelete}
          onNotesSubmit={handleNotesSubmit}
          onNotesUpdate={handleNotesUpdate}
        />

        {/* Export Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Reviews</DialogTitle>
              <DialogDescription>
                Choose a format to export your reviews
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center"
                onClick={() => handleExportReviews('csv')}
              >
                <Download className="h-8 w-8 mb-2" />
                <span className="text-lg font-medium">CSV</span>
                <span className="text-xs text-muted-foreground">Spreadsheet Format</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center"
                onClick={() => handleExportReviews('pdf')}
              >
                <Download className="h-8 w-8 mb-2" />
                <span className="text-lg font-medium">PDF</span>
                <span className="text-xs text-muted-foreground">Document Format</span>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Review Dialog */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Reviews</DialogTitle>
              <DialogDescription>
                This feature will be implemented in a future update
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-muted-foreground">
                Coming soon! You'll be able to send review requests to your clients.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsRequestDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 
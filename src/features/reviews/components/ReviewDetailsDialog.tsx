import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { Star, MessageSquare, FilePenLine, Loader2 } from 'lucide-react';
import { Review, ReviewResponse } from '../types';
import { toast } from 'sonner';

interface ReviewDetailsDialogProps {
  review: Review | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onStatusChange: (reviewId: string, status: 'published' | 'rejected' | 'flagged') => Promise<void>;
  onResponseSubmit: (
    reviewId: string,
    content: string,
    isPublished: boolean
  ) => Promise<void>;
  onResponseDelete: (responseId: string) => Promise<void>;
  onNotesSubmit: (reviewId: string, content: string) => Promise<void>;
  onNotesUpdate: (noteId: string, content: string) => Promise<void>;
}

export function ReviewDetailsDialog({
  review,
  isOpen,
  isLoading,
  onClose,
  onStatusChange,
  onResponseSubmit,
  onResponseDelete,
  onNotesSubmit,
  onNotesUpdate,
}: ReviewDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [responseText, setResponseText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset state when dialog opens/closes or review changes
  const resetState = () => {
    setActiveTab('details');
    setResponseText(review?.response?.content || '');
    setNoteText('');
    setIsSubmitting(false);
  };

  // Initialize response text when review changes
  useState(() => {
    if (review?.response?.content) {
      setResponseText(review.response.content);
    } else {
      setResponseText('');
    }
  });

  const handleReviewApprove = async () => {
    if (!review) return;
    
    try {
      setIsSubmitting(true);
      await onStatusChange(review.id, 'published');
      toast.success('Review published successfully');
    } catch (error) {
      console.error('Error approving review:', error);
      toast.error('Failed to publish review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewReject = async () => {
    if (!review) return;
    
    try {
      setIsSubmitting(true);
      await onStatusChange(review.id, 'rejected');
      toast.success('Review rejected');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewFlag = async () => {
    if (!review) return;
    
    try {
      setIsSubmitting(true);
      await onStatusChange(review.id, 'flagged');
      toast.success('Review flagged for review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResponseSubmit = async (isPublished: boolean = true) => {
    if (!review || !responseText.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onResponseSubmit(review.id, responseText, isPublished);
      toast.success(isPublished ? 'Response published' : 'Response saved as draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResponseDelete = async () => {
    if (!review?.response?.id) return;
    
    try {
      setIsSubmitting(true);
      await onResponseDelete(review.response.id);
      setResponseText('');
      toast.success('Response deleted');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotesSubmit = async () => {
    if (!review || !noteText.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onNotesSubmit(review.id, noteText);
      setNoteText('');
      toast.success('Note added');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Helper to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'flagged':
        return <Badge variant="warning">Flagged</Badge>;
      default:
        return null;
    }
  };

  // Early returns
  if (!isOpen) return null;
  
  if (isLoading || !review) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2">Loading review details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasResponse = !!review.response;
  const hasNotes = review.notes && review.notes.length > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Review Details</span>
              {renderStatusBadge(review.status)}
            </div>
            <div className="text-sm font-normal">
              {format(parseISO(review.createdAt), 'MMM d, yyyy')}
            </div>
          </DialogTitle>
          <DialogDescription>
            View and manage this client review
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="response">
              Response {hasResponse && <span className="ml-1 text-xs">●</span>}
            </TabsTrigger>
            <TabsTrigger value="notes">
              Notes {hasNotes && <span className="ml-1 text-xs">●</span>}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="flex items-start space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.patient.avatarUrl || ''} alt={review.patient.name} />
                <AvatarFallback>
                  {review.patient.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{review.patient.name}</h3>
                  {renderStars(review.rating)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Client ID: {review.patientId.slice(0, 8)}...
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{review.content}</p>
                </div>
              </div>
            </div>

            {review.status === 'pending' && (
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleReviewReject} disabled={isSubmitting}>
                  Reject
                </Button>
                <Button onClick={handleReviewApprove} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish'
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Response Tab */}
          <TabsContent value="response" className="space-y-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Write a response to this review..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <div className="flex justify-between">
                {hasResponse && (
                  <Button
                    variant="outline"
                    onClick={handleResponseDelete}
                    disabled={isSubmitting}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete Response
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => handleResponseSubmit(false)}
                    disabled={!responseText.trim() || isSubmitting}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleResponseSubmit(true)}
                    disabled={!responseText.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      'Publish Response'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            {/* Existing notes */}
            {hasNotes && (
              <div className="space-y-3">
                {review.notes.map((note) => (
                  <div key={note.id} className="bg-muted p-3 rounded-md">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(note.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add new note */}
            <div className="pt-4 space-y-2">
              <h4 className="text-sm font-medium">Add Private Note</h4>
              <Textarea
                placeholder="Add a private note about this review..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleNotesSubmit}
                  disabled={!noteText.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Note'
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
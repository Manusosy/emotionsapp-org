import { useState } from "react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableHead, TableRow, TableHeader, TableCell, TableBody, Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Filter, UserCheck, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";

// Sample review data
const mockReviews = [
  {
    id: "1",
    patient: {
      name: "John Smith",
      avatar: "/avatars/john-smith.jpg"
    },
    rating: 5,
    content: "Very helpful and understanding. Made me feel comfortable from the first session.",
    status: "published",
    date: new Date(2023, 4, 15)
  },
  {
    id: "2",
    patient: {
      name: "Sarah Johnson",
      avatar: "/avatars/sarah-johnson.jpg"
    },
    rating: 4,
    content: "Provides great advice and really listens. Would recommend.",
    status: "published",
    date: new Date(2023, 3, 22)
  },
  {
    id: "3",
    patient: {
      name: "Michael Brown",
      avatar: ""
    },
    rating: 3,
    content: "Good mood mentor, helped with my anxiety issues.",
    status: "pending",
    date: new Date(2023, 5, 2)
  },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(mockReviews);
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredReviews = activeFilter === "all" 
    ? reviews 
    : reviews.filter(review => review.status === activeFilter);

  const approveReview = (id: string) => {
    setReviews(reviews.map(review => 
      review.id === id ? { ...review, status: "published" } : review
    ));
  };

  const rejectReview = (id: string) => {
    setReviews(reviews.map(review => 
      review.id === id ? { ...review, status: "rejected" } : review
    ));
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Client Reviews</h1>
            <p className="text-muted-foreground">Manage your client testimonials and feedback</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeFilter === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveFilter("all")}
            >
              All
            </Button>
            <Button 
              variant={activeFilter === "published" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveFilter("published")}
            >
              Published
            </Button>
            <Button 
              variant={activeFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("pending")}
            >
              Pending
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Client Testimonials</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map(review => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.patient.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{review.content}</TableCell>
                    <TableCell>{format(review.date, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          review.status === "published" ? "default" :
                          review.status === "pending" ? "outline" : "destructive"
                        }
                      >
                        {review.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {review.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => approveReview(review.id)}
                          >
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => rejectReview(review.id)}
                          >
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <Filter className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 
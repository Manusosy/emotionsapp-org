import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewStats } from "../types";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie, Legend, AreaChart, Area } from "recharts";
import { format, parseISO, subDays } from "date-fns";

interface ReviewsAnalyticsProps {
  stats: ReviewStats;
  isLoading: boolean;
}

export function ReviewsAnalytics({ stats, isLoading }: ReviewsAnalyticsProps) {
  // Transform review data for charts
  const ratingData = Object.entries(stats.ratingDistribution).map(([rating, count]) => ({
    rating: parseInt(rating),
    count,
    name: `${rating} ★`,
  }));

  const statusData = Object.entries(stats.statusDistribution).map(([status, count]) => ({
    status,
    count,
    name: status.charAt(0).toUpperCase() + status.slice(1),
  }));

  const trendData = [...stats.reviewsOverTime]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      ...item,
      date: format(parseISO(item.date), 'MMM d'),
    }));

  // Colors for the charts
  const ratingColors = ["#ff7d7d", "#ff9b7d", "#ffd57d", "#b2e490", "#7dd87d"];
  const statusColors = {
    pending: "#facc15",
    published: "#22c55e",
    rejected: "#ef4444",
    flagged: "#f97316",
  };

  // If data is loading, show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent className="h-64 bg-muted rounded"></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent className="h-64 bg-muted rounded"></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Key metrics about your reviews</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
            <div className="text-xs text-muted-foreground">Total Reviews</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xl font-bold">{stats.averageRating.toFixed(1)} ★</div>
              <div className="text-xs text-muted-foreground">Average Rating</div>
            </div>
            <div>
              <div className="text-xl font-bold">{stats.pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending Reviews</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xl font-bold">{stats.publishedCount}</div>
              <div className="text-xs text-muted-foreground">Published</div>
            </div>
            <div>
              <div className="text-xl font-bold">{stats.rejectedCount + stats.flaggedCount}</div>
              <div className="text-xs text-muted-foreground">Rejected/Flagged</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ratings Distribution */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
          <CardDescription>Breakdown by star rating</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ratingData}
              margin={{ top: 10, right: 0, left: 0, bottom: 20 }}
              layout="vertical"
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value) => [`${value} reviews`, `${value} reviews`]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {ratingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ratingColors[entry.rating - 1]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Reviews Over Time */}
      <Card className="col-span-1 lg:col-span-1">
        <CardHeader>
          <CardTitle>Reviews Over Time</CardTitle>
          <CardDescription>Volume trend</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={30}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366F1"
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
} 
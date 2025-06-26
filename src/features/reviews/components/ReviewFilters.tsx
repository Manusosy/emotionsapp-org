import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FilterIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ReviewFilter, ReviewRating, ReviewStatus } from '../types';
import { DateRange } from 'react-day-picker';

export interface ReviewFiltersProps {
  filter: ReviewFilter;
  onFilterChange: (filter: ReviewFilter) => void;
  onResetFilters: () => void;
}

export function ReviewFilters({
  filter,
  onFilterChange,
  onResetFilters,
}: ReviewFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: filter.dateRange?.start ? new Date(filter.dateRange.start) : undefined,
    to: filter.dateRange?.end ? new Date(filter.dateRange.end) : undefined,
  });

  // Count active filters
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filter.status && filter.status !== 'all') count++;
    if (filter.rating && filter.rating !== 'all') count++;
    if (filter.dateRange) count++;
    if (filter.search && filter.search.trim() !== '') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  // Handler for status change
  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filter,
      status: value as ReviewStatus | 'all',
    });
  };

  // Handler for rating change
  const handleRatingChange = (value: string) => {
    onFilterChange({
      ...filter,
      rating: value === 'all' ? 'all' : Number(value) as ReviewRating,
    });
  };

  // Handler for search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filter,
      search: e.target.value,
    });
  };

  // Handler for date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && range?.to) {
      onFilterChange({
        ...filter,
        dateRange: {
          start: format(range.from, 'yyyy-MM-dd'),
          end: format(range.to, 'yyyy-MM-dd'),
        },
      });
    } else if (!range || (!range.from && !range.to)) {
      onFilterChange({
        ...filter,
        dateRange: null,
      });
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="relative w-full sm:w-auto sm:min-w-[320px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={filter.search || ''}
            onChange={handleSearchChange}
            className="pl-10"
          />
          {filter.search && filter.search.trim() !== '' && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 bg-transparent"
              onClick={() => onFilterChange({ ...filter, search: '' })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <Select
            value={filter.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>

          {/* Rating Filter */}
          <Select
            value={filter.rating?.toString() || 'all'}
            onValueChange={handleRatingChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`w-[200px] justify-start text-left font-normal ${filter.dateRange ? 'border-primary text-primary' : ''}`}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filter.dateRange ? (
                  <>
                    {format(new Date(filter.dateRange.start), 'MMM d, yyyy')} -{' '}
                    {format(new Date(filter.dateRange.end), 'MMM d, yyyy')}
                  </>
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              onClick={onResetFilters}
              className="h-10 px-3"
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Reset filters
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full px-0 text-xs font-normal">
                {activeFilterCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 
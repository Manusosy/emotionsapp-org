import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  title: string;
  description?: string;
  icon?: any;
  href: string;
  category: string;
}

interface DashboardSearchProps {
  searchableItems: SearchResult[];
}

export default function DashboardSearch({ searchableItems }: DashboardSearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Handle outside clicks for search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Function to handle search input
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Filter searchable items based on query
    const query = value.toLowerCase();
    const results = searchableItems.filter(item => 
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      item.category.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
  };

  // Function to handle search result click
  const handleSearchResultClick = (href: string) => {
    setIsSearchOpen(false);
    navigate(href);
  };

  return (
    <div className="hidden sm:block relative" ref={searchRef}>
      <Button
        variant="outline"
        className="w-full sm:w-64 justify-start"
        onClick={() => setIsSearchOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      {isSearchOpen && (
        <div className="absolute top-full left-0 mt-1 w-96 bg-white shadow-lg rounded-md border z-50">
          <div className="p-2">
            <Input
              type="search"
              placeholder="Search..."
              className="w-full"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className="p-2">
                {searchResults.map((result, index) => {
                  const ResultIcon = result.icon;
                  return (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                      onClick={() => handleSearchResultClick(result.href)}
                    >
                      <div className="flex items-center">
                        {ResultIcon && <ResultIcon className="h-4 w-4 mr-2 text-gray-500" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{result.title}</p>
                          {result.description && (
                            <p className="text-xs text-gray-500">{result.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery ? (
              <div className="p-4 text-center text-gray-500">
                No results found
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
} 
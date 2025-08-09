import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Eye, 
  Share2,
  BookOpen,
  Tag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  thumbnail_url?: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  status: 'draft' | 'published';
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  read_time: number;
  view_count: number;
}

export default function ArticleViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchArticle(id);
      incrementViewCount(id);
    }
  }, [id]);

  const fetchArticle = async (articleId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      
      setArticle(data);
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('Article not found');
      navigate('/resources');
    } finally {
      setIsLoading(false);
    }
  };

  const incrementViewCount = async (articleId: string) => {
    try {
      await supabase.rpc('increment_article_views', { article_id: articleId });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const formatContent = (content: string) => {
    return content
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-6">$1</h1>')
      
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Code
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full rounded-lg my-4" />')
      
      // Lists
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ul class="list-disc pl-6 my-4">$1</ul>')
      
      // Numbered lists
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ol class="list-decimal pl-6 my-4">$1</ol>')
      
      // Quotes
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600">$1</blockquote>')
      
      // Paragraphs
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.trim() && !paragraph.startsWith('<')) {
          return `<p class="mb-4 leading-relaxed">${paragraph}</p>`;
        }
        return paragraph;
      })
      .join('\n');
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: url
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Article URL copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy URL');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Article Not Found</h2>
            <p className="text-gray-600 mb-4">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/resources')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Resources
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Image */}
        {article.thumbnail_url && (
          <div className="mb-8">
            <img
              src={article.thumbnail_url}
              alt={article.title}
              className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(article.published_at || article.created_at), 'MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {article.read_time} min read
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {article.view_count} views
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="h-10 w-10">
              {article.author_avatar ? (
                <AvatarImage src={article.author_avatar} />
              ) : (
                <AvatarFallback>
                  {article.author_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="font-medium text-gray-900">{article.author_name}</div>
              <div className="text-sm text-gray-600">Mood Mentor</div>
            </div>
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {article.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Excerpt */}
          <div className="text-lg text-gray-700 leading-relaxed p-4 bg-gray-100 rounded-lg border-l-4 border-blue-500">
            {article.excerpt}
          </div>
        </header>

        {/* Article Content */}
        <div 
          className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
        />

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {article.author_avatar ? (
                  <AvatarImage src={article.author_avatar} />
                ) : (
                  <AvatarFallback>
                    {article.author_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="font-medium text-gray-900">{article.author_name}</div>
                <div className="text-sm text-gray-600">
                  Professional Mood Mentor helping individuals achieve emotional wellness
                </div>
              </div>
            </div>
            
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Article
            </Button>
          </div>
        </footer>
      </article>
    </div>
  );
} 
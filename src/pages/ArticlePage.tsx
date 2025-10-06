import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Eye, 
  Share2,
  Tag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { RouteSEO } from '@/components/RouteSEO';
import { ArticleJsonLD } from '@/components/LLDJson';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
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

export default function ArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle(slug);
    }
  }, [slug]);

  const fetchArticle = async (articleSlug: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', articleSlug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      
      if (data) {
        setArticle(data);
        // Increment view count
        await incrementViewCount(data.id);
      }
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
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold text-[#001A41] mb-4 mt-8">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold text-[#001A41] mb-6 mt-10">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-[#001A41] mb-8 mt-12">$1</h1>')
      
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#001A41]">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Code
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-[#007BFF]">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#007BFF] hover:text-[#0056b3] underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full rounded-lg my-6 shadow-lg" />')
      
      // Lists
      .replace(/^- (.*$)/gm, '<li class="mb-2 text-gray-700">$1</li>')
      .replace(/(<li.*?<\/li>\s*)+/gs, '<ul class="list-disc pl-6 my-6 space-y-2">$&</ul>')
      
      // Numbered lists
      .replace(/^\d+\. (.*$)/gm, '<li class="mb-2 text-gray-700">$1</li>')
      .replace(/(<li.*?<\/li>\s*)+/gs, '<ol class="list-decimal pl-6 my-6 space-y-2">$&</ol>')
      
      // Quotes
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-[#007BFF] pl-6 py-4 my-6 bg-gray-50 rounded-r-lg italic text-gray-700">$1</blockquote>')
      
      // Paragraphs
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.trim() && !paragraph.startsWith('<')) {
          return `<p class="mb-6 text-gray-700 leading-relaxed">${paragraph}</p>`;
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
      <div className="min-h-screen relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E7E1FF] to-[#FEFEFF] opacity-80"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-[#D4E6FF] opacity-90"></div>
        
        <div className="relative z-10">
          <div className="container mx-auto px-4 py-16">
            <div className="animate-pulse">
              <div className="h-96 bg-gray-200 rounded-lg mb-8"></div>
              <div className="max-w-4xl mx-auto">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E7E1FF] to-[#FEFEFF] opacity-80"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-[#D4E6FF] opacity-90"></div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-[#001A41] mb-4">Article Not Found</h2>
            <p className="text-gray-600 mb-6">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/resources')} className="bg-[#007BFF] hover:bg-[#0056b3]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Resources
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <RouteSEO 
        title={article.title}
        description={article.excerpt}
        path={`/articles/${article.slug}`}
        image={article.thumbnail_url || '/og-image.png'}
        type="article"
        publishedTime={article.published_at || article.created_at}
        modifiedTime={article.updated_at}
        keywords={article.tags}
      />
      <ArticleJsonLD 
        title={article.title}
        description={article.excerpt}
        url={`${window.location.origin}/articles/${article.slug}`}
        image={article.thumbnail_url || undefined}
        datePublished={article.published_at || article.created_at}
        dateModified={article.updated_at}
        authorName={article.author_name}
        tags={article.tags}
      />
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#E7E1FF] to-[#FEFEFF] opacity-80"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-[#D4E6FF] opacity-90"></div>
      
      {/* Hero Section with Article Thumbnail */}
      <div className="relative z-10">
        {article.thumbnail_url ? (
          <div 
            className="relative h-96 bg-cover bg-center"
            style={{ 
              backgroundImage: `linear-gradient(rgba(0, 26, 65, 0.7), rgba(0, 26, 65, 0.7)), url(${article.thumbnail_url})` 
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-4xl px-4">
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6"
                >
                  <span className="text-white">Article</span>
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-3xl md:text-5xl font-bold text-white mb-4 font-jakarta leading-tight"
                >
                  {article.title}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg text-white/90 font-jakarta max-w-2xl mx-auto"
                >
                  {article.excerpt}
                </motion.p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center items-center py-16">
            <div className="text-center max-w-4xl px-4">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6"
              >
                <span className="text-white">Article</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-5xl font-bold text-[#001A41] mb-4 font-jakarta leading-tight"
              >
                {article.title}
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-gray-600 font-jakarta max-w-2xl mx-auto"
              >
                {article.excerpt}
              </motion.p>
            </div>
          </div>
        )}
        
        {/* Article Meta Information */}
        <div className="bg-white py-6 border-b">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
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
                    <div className="font-semibold text-[#001A41]">{article.author_name}</div>
                    <div className="text-sm text-gray-600">Mood Mentor</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(article.published_at || article.created_at), 'MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {article.read_time} min read
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {article.view_count} views
                  </div>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {article.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Article Content */}
        <div className="container mx-auto px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8"
          >
            <div className="prose prose-blue max-w-none">
              <div 
                className="text-left"
                dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
              />
            </div>
          </motion.div>
          
          {/* Author Bio Footer */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-4xl mx-auto mt-8 bg-white rounded-2xl shadow-sm p-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-16 w-16">
                {article.author_avatar ? (
                  <AvatarImage src={article.author_avatar} />
                ) : (
                  <AvatarFallback>
                    {article.author_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#001A41]">About {article.author_name}</h3>
                <p className="text-gray-600 mt-1">
                  Professional Mood Mentor helping individuals achieve emotional wellness and mental health stability.
                </p>
              </div>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Article
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 
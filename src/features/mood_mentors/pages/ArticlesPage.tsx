import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/authContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Save, 
  X,
  Bold,
  Italic,
  Underline,
  Link,
  Image as ImageIcon,
  Type,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Search,
  Filter,
  BookOpen,
  Calendar,
  User,
  FileText,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { resourceService } from '@/services/resource/resource.service';

// Article interface
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

// Article categories for organization
const articleCategories = [
  'Mental Health',
  'Wellness Tips',
  'Coping Strategies',
  'Self-Care',
  'Mindfulness',
  'Stress Management',
  'Emotional Intelligence',
  'Relationships',
  'Lifestyle',
  'Recovery',
  'Prevention',
  'Research & Studies'
];

export default function ArticlesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editor state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Check if user is mood mentor
  const isMoodMentor = user?.user_metadata?.role === 'mood_mentor';

  useEffect(() => {
    if (!isMoodMentor) {
      navigate('/dashboard');
      return;
    }
    fetchArticles();
  }, [isMoodMentor, navigate]);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('author_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const generateExcerpt = (content: string, maxLength: number = 160) => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength).trim() + '...'
      : plainText;
  };

  const handleSaveArticle = async () => {
    try {
      if (!title.trim()) {
        toast.error('Title is required');
        return;
      }
      
      if (!content.trim()) {
        toast.error('Content is required');
        return;
      }

      setIsSaving(true);

      const readTime = calculateReadTime(content);
      const autoExcerpt = excerpt.trim() || generateExcerpt(content);

      const articleData = {
        title: title.trim(),
        content: content.trim(),
        excerpt: autoExcerpt,
        thumbnail_url: thumbnailUrl || null,
        author_id: user?.id,
        author_name: user?.user_metadata?.name || 'Mood Mentor',
        author_avatar: user?.user_metadata?.avatar_url,
        status,
        tags: selectedTags,
        read_time: readTime,
        ...(status === 'published' && !editingArticle?.published_at && {
          published_at: new Date().toISOString()
        })
      };

      let result;

      if (editingArticle) {
        // Update existing article
        result = await supabase
          .from('articles')
          .update({ ...articleData, updated_at: new Date().toISOString() })
          .eq('id', editingArticle.id)
          .select()
          .single();
      } else {
        // Create new article
        result = await supabase
          .from('articles')
          .insert([articleData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // If published, also add to resources
      if (status === 'published') {
        await addToResources(result.data);
      }

      toast.success(editingArticle ? 'Article updated successfully' : 'Article created successfully');
      setIsEditorOpen(false);
      resetEditor();
      fetchArticles();

    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Failed to save article');
    } finally {
      setIsSaving(false);
    }
  };

  const addToResources = async (article: Article) => {
    try {
      const resourceData = {
        title: article.title,
        description: article.excerpt,
        type: 'article' as const,
        category: 'educational',
        url: `/articles/${article.id}`, // Internal link
        thumbnail_url: article.thumbnail_url || '',
        author: article.author_name,
        author_role: 'Mood Mentor',
        author_avatar: article.author_avatar,
        mood_mentor_id: user?.id,
        read_time: `${article.read_time} min read`,
        tags: article.tags
      };

      await resourceService.addResource(resourceData);
    } catch (error) {
      console.error('Error adding article to resources:', error);
      // Don't show error to user as article was saved successfully
    }
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setExcerpt(article.excerpt);
    setThumbnailUrl(article.thumbnail_url || '');
    setSelectedTags(article.tags || []);
    setStatus(article.status);
    setIsEditorOpen(true);
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      toast.success('Article deleted successfully');
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Failed to delete article');
    }
  };

  const resetEditor = () => {
    setEditingArticle(null);
    setTitle('');
    setContent('');
    setExcerpt('');
    setThumbnailUrl('');
    setSelectedTags([]);
    setStatus('draft');
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const insertHeading = (level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    insertText(prefix);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      const text = prompt('Enter link text:', url);
      insertText(`[${text || url}](${url})`);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      const alt = prompt('Enter alt text:', 'Image');
      insertText(`![${alt}](${url})`);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.tags.includes(selectedCategory);
    const matchesStatus = selectedStatus === 'all' || article.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (!isMoodMentor) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Articles</h1>
            <p className="text-muted-foreground">
              Create and manage your educational articles
            </p>
          </div>
          <Button onClick={() => setIsEditorOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {articleCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Articles List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map(article => (
              <Card key={article.id} className="shadow-sm hover:shadow-md transition-shadow">
                <div className="relative">
                  {article.thumbnail_url && (
                    <img
                      src={article.thumbnail_url}
                      alt={article.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                      {article.status}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">{article.excerpt}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(article.created_at), 'MMM d, yyyy')}
                    <span>•</span>
                    <span>{article.read_time} min read</span>
                    {article.view_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{article.view_count} views</span>
                      </>
                    )}
                  </div>

                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {article.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {article.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{article.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {article.author_avatar ? (
                          <AvatarImage src={article.author_avatar} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {article.author_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-xs text-gray-600">{article.author_name}</span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <span className="sr-only">Actions</span>
                          ⋮
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/articles/${article.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditArticle(article)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteArticle(article.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="py-10 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'No articles match your current filters.'
                  : 'Start creating your first article to share knowledge and insights.'}
              </p>
              {!searchQuery && selectedCategory === 'all' && selectedStatus === 'all' && (
                <Button onClick={() => setIsEditorOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Article
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Article Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) resetEditor();
        }}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingArticle ? 'Edit Article' : 'Create New Article'}
              </DialogTitle>
              <DialogDescription>
                Write and format your article using the editor below
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Article Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter article title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: 'draft' | 'published') => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief description (auto-generated if empty)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL</Label>
                <Input
                  id="thumbnail"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Editor Toolbar */}
              <div className="border rounded-lg">
                <div className="border-b p-2 flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" onClick={() => insertHeading(1)}>
                    <Type className="h-4 w-4" />
                    H1
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => insertHeading(2)}>
                    <Type className="h-4 w-4" />
                    H2
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => insertHeading(3)}>
                    <Type className="h-4 w-4" />
                    H3
                  </Button>
                  <div className="border-l mx-1" />
                  <Button variant="ghost" size="sm" onClick={() => insertText('**', '**')}>
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => insertText('*', '*')}>
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => insertText('`', '`')}>
                    <Code className="h-4 w-4" />
                  </Button>
                  <div className="border-l mx-1" />
                  <Button variant="ghost" size="sm" onClick={insertLink}>
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={insertImage}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <div className="border-l mx-1" />
                  <Button variant="ghost" size="sm" onClick={() => insertText('- ')}>
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => insertText('1. ')}>
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => insertText('> ')}>
                    <Quote className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content Editor */}
                <Textarea
                  ref={editorRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your article content here... 

You can use Markdown formatting:
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
[Link text](https://example.com)
![Image alt text](https://example.com/image.jpg)

- List item
- List item

1. Numbered item
2. Numbered item

> Quote text"
                  className="min-h-[400px] border-0 resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {articleCategories.map(category => (
                    <Button
                      key={category}
                      variant={selectedTags.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(category)
                            ? prev.filter(t => t !== category)
                            : [...prev, category]
                        );
                      }}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditorOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveArticle} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingArticle ? 'Update' : 'Save'} Article
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 
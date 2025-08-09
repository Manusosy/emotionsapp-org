import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/authContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Search,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Plus,
  BookOpen,
  Video,
  Upload,
  Headphones,
  Users,
  Calendar,
  Eye,
  Clock,
  Check,
  Info,
  Settings
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ResourceThumbnailUpload } from '../components/ResourceThumbnailUpload';
import { UploadProgress } from '../components/UploadProgress';
import { AnimatePresence } from 'framer-motion';
import { formatFileSize } from '@/utils/formatters';
import { resourceService } from '@/services/resource/resource.service';
import { Resource } from '@/types/database.types';
import { format } from 'date-fns';

// Form data interface
interface ResourceFormData {
  title: string;
  description: string;
  type: string;
  category: string;
  url: string;
  thumbnail_url: string;
  file: File | null;
}

// Resource categories and types
const resourceCategories = [
  { value: "educational", label: "Educational Materials" },
  { value: "self-help", label: "Self-Help Tools" },
  { value: "crisis", label: "Crisis Support" },
  { value: "video", label: "Video Resources" },
  { value: "community", label: "Community Support" },
  { value: "digital", label: "Digital Tools" },
];

const resourceTypes = [
  { value: "document", label: "Document", icon: <FileText className="h-4 w-4" /> },
  { value: "video", label: "Video", icon: <Video className="h-4 w-4" /> },
  { value: "article", label: "Article", icon: <BookOpen className="h-4 w-4" /> },
  { value: "podcast", label: "Podcast", icon: <Headphones className="h-4 w-4" /> },
  { value: "group", label: "Support Group", icon: <Users className="h-4 w-4" /> },
  { value: "workshop", label: "Workshop", icon: <Calendar className="h-4 w-4" /> },
];

// Default thumbnails for resource types
const defaultThumbnails: { [key: string]: string } = {
  document: "https://images.unsplash.com/photo-1551847677-dc82d764e1eb?q=80&w=500&auto=format&fit=crop",
  video: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=500&auto=format&fit=crop",
  article: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=500&auto=format&fit=crop",
  podcast: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?q=80&w=500&auto=format&fit=crop",
  group: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=500&auto=format&fit=crop",
  workshop: "https://images.unsplash.com/photo-1558403194-611308249627?q=80&w=500&auto=format&fit=crop",
  link: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=500&auto=format&fit=crop",
  image: "https://images.unsplash.com/photo-1551847677-dc82d764e1eb?q=80&w=500&auto=format&fit=crop"
};

const ResourcesPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);

  // Form state
  const [formData, setFormData] = useState<ResourceFormData>({
    title: "",
    description: "",
    type: "document",
    category: "educational",
    url: "",
    thumbnail_url: "",
    file: null,
  });

  // Check if user is a mood mentor
  const isMoodMentor = user?.user_metadata?.role === 'mood_mentor';

  // Fetch resources created by this mood mentor
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        if (!isMoodMentor) {
          throw new Error('Only mood mentors can access this page');
        }
        
        const { success, data, error } = await resourceService.getResources({
          mentorId: user.id
        });
        
        if (!success || error) {
          throw new Error(error || 'Failed to fetch resources');
        }
        
        setResources(data || []);
      } catch (error: any) {
        console.error('Error fetching resources:', error);
        toast.error(error.message || 'Failed to load resources');
        setResources([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user?.id && isMoodMentor) {
      fetchResources();
    }
  }, [user, isMoodMentor]);

  // Filter resources based on search and category
  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchQuery.toLowerCase() === '' || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "document",
      category: "educational",
      url: "",
      thumbnail_url: "",
      file: null,
    });
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    setUploadComplete(false);
    setEditingResource(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
      // Reset upload states when new file is selected
      setUploadProgress(0);
      setIsUploading(false);
      setUploadError(null);
      setUploadComplete(false);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!isMoodMentor) {
        throw new Error('Only mood mentors can manage resources');
      }

      setIsSubmitting(true);

      // Validate required fields
      if (!formData.title.trim()) throw new Error('Title is required');
      if (!formData.description.trim()) throw new Error('Description is required');
      if (!formData.type) throw new Error('Resource type is required');
      if (!formData.category) throw new Error('Category is required');

      let fileUrl = '';
      if (formData.file) {
        setIsUploading(true);
        setUploadError(null);
        setUploadProgress(0);
        
        const { success, url, error } = await resourceService.uploadFile(
          formData.file,
          user.id,
          'resource',
          (progress) => {
            setUploadProgress(progress);
            if (progress === 100) {
              setUploadComplete(true);
            }
          }
        );

        if (!success || !url) {
          setUploadError(error || 'Failed to upload file');
          setIsUploading(false);
          throw new Error(error || 'Failed to upload file');
        }

        fileUrl = url;
        setIsUploading(false);
      }

      const resourceData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type as Resource['type'],
        category: formData.category,
        url: formData.url || fileUrl || (editingResource?.url || ''),
        file_url: fileUrl || (editingResource?.file_url || undefined),
        thumbnail_url: formData.thumbnail_url || defaultThumbnails[formData.type as keyof typeof defaultThumbnails],
        author: user.user_metadata?.name || 'Mood Mentor',
        author_role: 'Mentor',
        author_avatar: user.user_metadata?.avatar_url,
        mood_mentor_id: user.id
      };

      if (editingResource) {
        // Update existing resource
        const updateResult = await resourceService.updateResource(editingResource.id, resourceData);
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update resource');
        }

        setResources(prev => prev.map(r => r.id === editingResource.id ? { ...r, ...resourceData } : r));
        toast.success('Resource updated successfully');
        setIsEditDialogOpen(false);
        setEditingResource(null);
      } else {
        // Add new resource
        const addResult = await resourceService.addResource(resourceData);

        if (!addResult.success || !addResult.data) {
          throw new Error(addResult.error || 'Failed to add resource');
        }

        setResources(prev => [...prev, addResult.data!]);
        toast.success('Resource added successfully');
        setIsAddDialogOpen(false);
      }

      resetForm();
      
      // Refresh the resources list
      const { success: fetchSuccess, data: newData, error: fetchError } = await resourceService.getResources({
        mentorId: user.id
      });
        
      if (fetchSuccess && newData) {
        setResources(newData);
      }
    } catch (error: any) {
      console.error('Error managing resource:', error);
      toast.error(error.message || 'Failed to manage resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resource deletion
  const handleDelete = async (resourceId: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) {
      return;
    }
    
    try {
      const { success, error } = await resourceService.deleteResource(resourceId);
      
      if (!success) {
        throw new Error(error || 'Failed to delete resource');
      }
      
      setResources(prev => prev.filter(r => r.id !== resourceId));
      toast.success("Resource deleted successfully");
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast.error(error.message || "Failed to delete resource");
    }
  };

  // Handle resource click for viewer
  const handleResourceClick = (resource: Resource) => {
    setViewingResource(resource);
  };

  // Handle edit resource
  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      url: resource.url,
      thumbnail_url: resource.thumbnail_url || "",
      file: null,
    });
    setIsEditDialogOpen(true);
  };

  // Get category color
  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      case 'article':
        return 'bg-purple-100 text-purple-800';
      case 'podcast':
        return 'bg-orange-100 text-orange-800';
      case 'group':
        return 'bg-red-100 text-red-800';
      case 'workshop':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get resource icon
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-3 w-3" />;
      case 'document':
        return <FileText className="h-3 w-3" />;
      case 'article':
        return <BookOpen className="h-3 w-3" />;
      case 'podcast':
        return <Headphones className="h-3 w-3" />;
      case 'group':
        return <Users className="h-3 w-3" />;
      case 'workshop':
        return <Calendar className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  // Get embed URL for video if URL is a direct video link
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/watch')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      }
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
    } else if (url.includes('vimeo.com')) {
      const videoId = url.split('/')[url.split('/').length - 1];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  // Add role check to the render
  if (!isMoodMentor) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Resources</h1>
          <p className="text-red-500">Only mood mentors can access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Resources Management</h1>
            <p className="text-muted-foreground">
              Add and manage resources to share with users on the public resources page.
            </p>
          </div>
          <Button 
            className="flex items-center gap-2" 
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus size={16} />
            Add Resource
          </Button>
        </div>
        
        {/* Search and filter */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search resources..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {resourceCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Resources list */}
        {isLoading ? (
          <div className="space-y-4">
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
        ) : filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredResources.map(resource => (
              <Card key={resource.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleResourceClick(resource)}>
                <div className="relative h-48">
                  <img 
                    src={resource.thumbnail_url || defaultThumbnails[resource.type] || defaultThumbnails.document} 
                    alt={resource.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = defaultThumbnails[resource.type] || defaultThumbnails.document;
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className={getCategoryColor(resource.type)}>
                      <div className="flex items-center gap-1">
                        {getResourceIcon(resource.type)}
                        <span className="text-xs">{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
                      </div>
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 w-8 p-0 bg-white/80 hover:bg-white/90"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                                             <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={(e) => {
                           e.stopPropagation();
                           handleResourceClick(resource);
                         }}>
                           <Eye className="h-4 w-4 mr-2" />
                           View
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={(e) => {
                           e.stopPropagation();
                           handleEditResource(resource);
                         }}>
                           <Settings className="h-4 w-4 mr-2" />
                           Edit
                         </DropdownMenuItem>
                         {!resource.url.includes('youtube') && !resource.url.includes('vimeo') && (
                           <DropdownMenuItem onClick={(e) => {
                             e.stopPropagation();
                             window.open(resource.file_url || resource.url, '_blank');
                           }}>
                             <Download className="h-4 w-4 mr-2" />
                             Download
                           </DropdownMenuItem>
                         )}
                         <DropdownMenuItem 
                           className="text-red-600"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDelete(resource.id);
                           }}
                         >
                           <Trash2 className="h-4 w-4 mr-2" />
                           Delete
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {resource.created_at && format(new Date(resource.created_at), 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-4">
                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                    {resource.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {resourceCategories.find(cat => cat.value === resource.category)?.label || resource.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {resource.type === 'video' && <Clock className="h-3 w-3" />}
                      {resource.type === 'document' && <FileText className="h-3 w-3" />}
                      {resource.type === 'article' && <BookOpen className="h-3 w-3" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="py-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                <BookOpen className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'No resources match your current filters.' 
                  : 'Start by adding your first resource.'
                }
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Resource Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
            <DialogDescription>
              Share resources with users to help them on their mental health journey.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-medium">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter resource title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="font-medium">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter resource description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="font-medium">Resource Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          {type.icon}
                          <span className="ml-2">{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="font-medium">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url" className="font-medium">URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="Enter URL (optional for documents)"
                value={formData.url}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500">
                For articles, videos, or external resources, provide the URL where the content can be accessed.
              </p>
            </div>
            
            <div className="space-y-4">
              <ResourceThumbnailUpload
                onThumbnailChange={(url) => setFormData(prev => ({ ...prev, thumbnail_url: url }))}
                existingThumbnail={formData.thumbnail_url}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-medium">File Upload</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                <Input
                  id="file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  accept={formData.type === 'document' ? '.pdf,.doc,.docx' : 
                         formData.type === 'video' ? '.mp4,.mov' :
                         formData.type === 'podcast' ? '.mp3,.m4a' : undefined}
                />
                
                {/* Upload Progress */}
                <AnimatePresence>
                  {isUploading && formData.file && (
                    <div className="mb-4">
                      <UploadProgress
                        progress={uploadProgress}
                        fileName={formData.file.name}
                        fileSize={formatFileSize(formData.file.size)}
                        isComplete={uploadComplete}
                        hasError={!!uploadError}
                        errorMessage={uploadError || undefined}
                        onCancel={() => {
                          setIsUploading(false);
                          setUploadProgress(0);
                          setUploadError(null);
                          setUploadComplete(false);
                        }}
                      />
                    </div>
                  )}
                </AnimatePresence>
                
                <div className="space-y-2">
                  {formData.file && !isUploading && (
                    <div className="text-sm">
                      <p className="font-medium">{formData.file.name}</p>
                      <p className="text-gray-500">
                        {formatFileSize(formData.file.size)}
                      </p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant={formData.file ? "outline" : "secondary"}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 w-full"
                    disabled={!['document', 'video', 'podcast'].includes(formData.type) || isUploading}
                  >
                    {formData.file ? "Change File" : "Select File"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {formData.type === 'document' && 'Supported formats: PDF, DOC, DOCX'}
                {formData.type === 'video' && 'Supported formats: MP4, MOV'}
                {formData.type === 'podcast' && 'Supported formats: MP3, M4A'}
                {!['document', 'video', 'podcast'].includes(formData.type) && 
                  'Select a resource type to see supported file formats'}
              </p>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isUploading || !formData.title || !formData.description || !formData.type || !formData.category}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Saving...
                  </div>
                ) : isUploading ? (
                  <div className="flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Uploading...
                  </div>
                ) : 'Add Resource'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>
              Update the resource information below.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter resource title"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this resource"
                rows={3}
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {resourceCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
              <Input
                id="edit-thumbnail"
                type="url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                disabled={isSubmitting}
              />
            </div>
            
            {/* File upload section for updating files */}
            <div className="space-y-2">
              <Label>Update File (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept={formData.type === 'document' ? '.pdf,.doc,.docx' : 
                         formData.type === 'video' ? '.mp4,.mov' : 
                         formData.type === 'podcast' ? '.mp3,.m4a' : '*'}
                  className="hidden"
                  disabled={!['document', 'video', 'podcast'].includes(formData.type) || isUploading}
                />
                
                                 {isUploading && (
                   <div>
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                       <div 
                         className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                         style={{ width: `${uploadProgress}%` }}
                       ></div>
                     </div>
                     <p className="text-sm text-gray-600">{uploadProgress}% uploaded</p>
                   </div>
                 )}
                
                {uploadError && (
                  <div className="text-red-500 text-sm mb-2">{uploadError}</div>
                )}
                
                <div className="text-center">
                  {formData.file && (
                    <div className="mb-2 text-sm text-gray-600">
                      <p className="font-medium">{formData.file.name}</p>
                      <p className="text-gray-500">
                        {formatFileSize(formData.file.size)}
                      </p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant={formData.file ? "outline" : "secondary"}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 w-full"
                    disabled={!['document', 'video', 'podcast'].includes(formData.type) || isUploading}
                  >
                    {formData.file ? "Change File" : "Select New File"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {formData.type === 'document' && 'Supported formats: PDF, DOC, DOCX'}
                {formData.type === 'video' && 'Supported formats: MP4, MOV'}
                {formData.type === 'podcast' && 'Supported formats: MP3, M4A'}
                {!['document', 'video', 'podcast'].includes(formData.type) && 
                  'Select a resource type to see supported file formats'}
              </p>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  resetForm();
                  setIsEditDialogOpen(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isUploading || !formData.title || !formData.description || !formData.type || !formData.category}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Updating...
                  </div>
                ) : isUploading ? (
                  <div className="flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Uploading...
                  </div>
                ) : 'Update Resource'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resource Viewer Dialog */}
      <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-lg font-semibold line-clamp-1">
              {viewingResource?.title}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {viewingResource?.description}
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {viewingResource && (
              <div className="h-full w-full">
                {viewingResource.type === 'video' || viewingResource.url.includes('youtube') || viewingResource.url.includes('vimeo') ? (
                  <iframe
                    src={getEmbedUrl(viewingResource.file_url || viewingResource.url)}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : viewingResource.type === 'document' || viewingResource.url.includes('.pdf') ? (
                  <iframe
                    src={viewingResource.file_url || viewingResource.url}
                    className="w-full h-full"
                    frameBorder="0"
                  />
                ) : (
                  <iframe
                    src={viewingResource.file_url || viewingResource.url}
                    className="w-full h-full"
                    frameBorder="0"
                  />
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge className={getCategoryColor(viewingResource?.type || '')}>
                  {getResourceIcon(viewingResource?.type || '')}
                  <span className="ml-1">{viewingResource?.type}</span>
                </Badge>
                <Badge variant="secondary">
                  {resourceCategories.find(cat => cat.value === viewingResource?.category)?.label || viewingResource?.category}
                </Badge>
              </div>
                             <div className="flex items-center gap-2">
                 {!viewingResource?.url?.includes('youtube') && !viewingResource?.url?.includes('vimeo') && (
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => window.open(viewingResource?.file_url || viewingResource?.url, '_blank')}
                   >
                     <Download className="h-4 w-4 mr-2" />
                     Download
                   </Button>
                 )}
                 <Button 
                   variant="outline" 
                   size="sm"
                   onClick={() => navigator.clipboard.writeText(viewingResource?.file_url || viewingResource?.url || '')}
                 >
                   <Share2 className="h-4 w-4 mr-2" />
                   Share
                 </Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ResourcesPage; 




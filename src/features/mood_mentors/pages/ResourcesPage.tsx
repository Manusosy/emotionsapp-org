import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/authContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Info
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
const defaultThumbnails = {
  document: "https://images.unsplash.com/photo-1551847677-dc82d764e1eb?q=80&w=500&auto=format&fit=crop",
  video: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=500&auto=format&fit=crop",
  article: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=500&auto=format&fit=crop",
  podcast: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?q=80&w=500&auto=format&fit=crop",
  group: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=500&auto=format&fit=crop",
  workshop: "https://images.unsplash.com/photo-1558403194-611308249627?q=80&w=500&auto=format&fit=crop"
};

const ResourcesPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle resource view
  const handleResourceView = (resource: Resource) => {
    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    } else if (resource.url) {
      window.open(resource.url, '_blank');
    } else {
      toast.error('No viewable content available');
    }
  };

  // Handle resource sharing
  const handleShare = async (resource: Resource) => {
    try {
      await navigator.clipboard.writeText(resource.url || resource.file_url || '');
      toast.success('Resource link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Toggle resource featured status
  const toggleFeature = async (resource: Resource) => {
    try {
      const { success, error } = await resourceService.updateResource(resource.id, {
        featured: !resource.featured
      });

      if (!success) {
        throw new Error(error || 'Failed to update resource');
      }

      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, featured: !r.featured } : r
      ));

      toast.success(
        resource.featured ? 
        'Resource removed from featured' : 
        'Resource marked as featured'
      );
    } catch (error: any) {
      console.error('Error updating resource:', error);
      toast.error(error.message || 'Failed to update resource');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!isMoodMentor) {
        throw new Error('Only mood mentors can create resources');
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

      const { success, data, error } = await resourceService.addResource({
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type as Resource['type'],
        category: formData.category,
        url: formData.url || fileUrl,
        file_url: fileUrl || undefined,
        thumbnail_url: formData.thumbnail_url || defaultThumbnails[formData.type as keyof typeof defaultThumbnails],
        author: user.user_metadata?.name || 'Mood Mentor',
        author_role: 'Mentor',
        author_avatar: user.user_metadata?.avatar_url,
        mood_mentor_id: user.id
      });

      if (!success || !data) {
        throw new Error(error || 'Failed to add resource');
      }

      setResources(prev => [...prev, data]);
      toast.success('Resource added successfully');
      resetForm();
      setIsAddDialogOpen(false);
      
      // Refresh the resources list
      const { success: fetchSuccess, data: newData, error: fetchError } = await resourceService.getResources({
        mentorId: user.id
      });
        
      if (!fetchSuccess) {
        throw new Error(fetchError || 'Failed to refresh resources');
      }
      
      setResources(newData);
    } catch (error: any) {
      console.error('Error adding resource:', error);
      toast.error(error.message || 'Failed to add resource');
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
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Resources Management</h1>
            <p className="text-gray-600">
              Add and manage resources to share with users on the public resources page.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            <Button 
              className="flex items-center gap-2" 
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus size={16} />
              Add Resource
            </Button>
          </div>
        </div>
        
        {/* Search and filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search resources..."
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
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
        
        {/* Resources list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(resource => (
              <Card key={resource.id} className="overflow-hidden">
                <div className="relative h-40">
                  {resource.thumbnail_url ? (
                    <img 
                      src={resource.thumbnail_url} 
                      alt={resource.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      {resourceTypes.find(t => t.value === resource.type)?.icon}
                    </div>
                  )}
                  {resource.featured && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-yellow-500">Featured</Badge>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary">
                      {resourceTypes.find(t => t.value === resource.type)?.label}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="font-bold text-lg line-clamp-1">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-gray-600 text-sm line-clamp-2 mb-2">{resource.description}</p>
                  <div className="flex items-center text-xs text-gray-500 gap-2">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>
                        {new Date(resource.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {resource.downloads && resource.downloads > 0 && (
                      <div className="flex items-center">
                        <Download className="h-3 w-3 mr-1" />
                        <span>{resource.downloads}</span>
                      </div>
                    )}
                    {resource.shares && resource.shares > 0 && (
                      <div className="flex items-center">
                        <Share2 className="h-3 w-3 mr-1" />
                        <span>{resource.shares}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="h-8"
                      onClick={() => handleResourceView(resource)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8"
                      onClick={() => handleShare(resource)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleFeature(resource)}>
                        {resource.featured ? (
                          <>
                            <Info className="h-4 w-4 mr-2" />
                            Remove from Featured
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Featured
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(resource.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Resource
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No resources found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedCategory !== "all" ? 
                "Try adjusting your search or filters." : 
                "You haven't added any resources yet."}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Resource
            </Button>
          </div>
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
    </DashboardLayout>
  );
};

export default ResourcesPage; 




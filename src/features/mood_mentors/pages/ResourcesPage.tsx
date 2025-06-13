import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
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

// Resource interface
interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'podcast' | 'document' | 'group' | 'workshop';
  url: string;
  file_url?: string;
  thumbnail_url?: string;
  category: string;
  tags?: string[];
  author?: string;
  author_role?: string;
  author_avatar?: string;
  read_time?: string;
  duration?: string;
  featured?: boolean;
  downloads?: number;
  shares?: number;
  mood_mentor_id?: string;
  created_at: string;
  updated_at?: string;
}

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

// Resource categories
const resourceCategories = [
  { value: "educational", label: "Educational Materials" },
  { value: "self-help", label: "Self-Help Tools" },
  { value: "crisis", label: "Crisis Support" },
  { value: "video", label: "Video Resources" },
  { value: "community", label: "Community Support" },
  { value: "digital", label: "Digital Tools" },
];

// Resource types
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  // Fetch resources created by this mood mentor
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        
        if (!user?.id) return;
        
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('mood_mentor_id', user.id);
        
        if (error) {
          throw error;
        }
        
        setResources(data || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
        toast.error('Failed to load resources');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResources();
  }, [user]);

  // Filter resources based on search and category
  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchQuery || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === "all" || 
      resource.category === selectedCategory;
      
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

  // Handle file input changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
    setUploadedFile(file);
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "document",
      category: "educational",
      url: "",
      thumbnail_url: "",
      file: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadedFile(null);
  };

  // Upload file to Supabase storage
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      if (!file) return null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `resources/${fileName}`;
      
      // Try to upload to 'resources' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('resources')
        .getPublicUrl(filePath);
      
      return urlData?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  // Handle resource download/view
  const handleResourceView = async (resource: Resource) => {
    try {
      const viewUrl = resource.file_url || resource.url;
      
      if (!viewUrl) {
        toast.error("No URL available for this resource");
        return;
      }
      
      // Increment download count
      const currentDownloads = resource.downloads || 0;
      await supabase
        .from('resources')
        .update({ downloads: currentDownloads + 1 })
        .eq('id', resource.id);
      
      // Update local state
      setResources(prev => 
        prev.map(res => 
          res.id === resource.id 
            ? { ...res, downloads: (res.downloads || 0) + 1 } 
            : res
        )
      );
      
      // Open the URL
      window.open(viewUrl, "_blank");
    } catch (error) {
      console.error('Error viewing resource:', error);
      toast.error("Failed to view resource");
    }
  };

  // Handle resource sharing
  const handleShare = async (resource: Resource) => {
    try {
      const shareUrl = resource.url || resource.file_url;
      
      if (!shareUrl) {
        toast.error("No URL available to share");
        return;
      }
      
      await navigator.clipboard.writeText(shareUrl);
      
      // Increment share count
      const currentShares = resource.shares || 0;
      await supabase
        .from('resources')
        .update({ shares: currentShares + 1 })
        .eq('id', resource.id);
      
      // Update local state
      setResources(prev => 
        prev.map(res => 
          res.id === resource.id 
            ? { ...res, shares: (res.shares || 0) + 1 } 
            : res
        )
      );
      
      toast.success("Resource link copied to clipboard");
    } catch (error) {
      console.error('Error sharing resource:', error);
      toast.error("Failed to share resource");
    }
  };

  // Handle resource deletion
  const handleDelete = async (resourceId: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);
      
      if (error) throw error;
      
      // Update local state
      setResources(prev => prev.filter(resource => resource.id !== resourceId));
      
      toast.success("Resource deleted successfully");
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error("Failed to delete resource");
    }
  };

  // Toggle featured status
  const toggleFeature = async (resource: Resource) => {
    try {
      const newFeaturedValue = !resource.featured;
      
      const { error } = await supabase
        .from('resources')
        .update({ featured: newFeaturedValue })
        .eq('id', resource.id);
      
      if (error) throw error;
      
      // Update local state
      setResources(prev => 
        prev.map(res => 
          res.id === resource.id 
            ? { ...res, featured: newFeaturedValue } 
            : res
        )
      );
      
      toast.success(newFeaturedValue 
        ? "Resource is now featured on the public page" 
        : "Resource removed from featured section");
    } catch (error) {
      console.error('Error toggling feature status:', error);
      toast.error("Failed to update resource");
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Validate form data
      if (!formData.title) throw new Error("Title is required");
      if (!formData.description) throw new Error("Description is required");
      
      let fileUrl: string | null = null;
      let resourceUrl = formData.url;
      let thumbnailUrl = formData.thumbnail_url;
      
      // Handle file upload if provided
      if (formData.file) {
        fileUrl = await uploadFile(formData.file);
        
        if (!fileUrl) {
          throw new Error("Failed to upload file");
        }
        
        // If no URL was provided, use the file URL
        if (!resourceUrl) {
          resourceUrl = fileUrl;
        }
      }
      
      // Ensure we have a URL
      if (!resourceUrl && !fileUrl) {
        throw new Error("Either a URL or file must be provided");
      }
      
      // If no thumbnail URL was provided, use default based on resource type
      if (!thumbnailUrl) {
        thumbnailUrl = defaultThumbnails[formData.type as keyof typeof defaultThumbnails];
      }
      
      // Current timestamp
      const now = new Date().toISOString();
      
      // Author information
      const author = user.user_metadata?.name || user.email || "Mood Mentor";
      const authorRole = "Mentor";
      
      // Prepare resource data
      const resourceData = {
        title: formData.title,
        description: formData.description,
        type: formData.type as Resource['type'],
        category: formData.category,
        url: resourceUrl,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        mood_mentor_id: user.id,
        author,
        author_role: authorRole,
        featured: false,
        downloads: 0,
        shares: 0,
        created_at: now,
        updated_at: now
      };
      
      // Insert into database
      const { data: insertedData, error: insertError } = await supabase
        .from('resources')
        .insert(resourceData)
        .select();
      
      if (insertError) {
        throw new Error(`Failed to add resource: ${insertError.message}`);
      }
      
      if (!insertedData || insertedData.length === 0) {
        throw new Error("Failed to add resource: No data returned");
      }
      
      // Update local state
      setResources(prev => [insertedData[0], ...prev]);
      
      // Reset form and close dialog
      resetForm();
      setIsAddDialogOpen(false);
      toast.success("Resource added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add resource");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get icon for resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-6 w-6 text-blue-500" />;
      case 'video': return <Video className="h-6 w-6 text-purple-500" />;
      case 'article': return <BookOpen className="h-6 w-6 text-gray-500" />;
      case 'podcast': return <Headphones className="h-6 w-6 text-green-500" />;
      case 'group': return <Users className="h-6 w-6 text-red-500" />;
      case 'workshop': return <Calendar className="h-6 w-6 text-teal-500" />;
      default: return <BookOpen className="h-6 w-6 text-gray-500" />;
    }
  };

  // Get label for resource type
  const getResourceTypeLabel = (type: string) => {
    switch (type) {
      case 'document': return 'Document';
      case 'video': return 'Video';
      case 'article': return 'Article';
      case 'podcast': return 'Podcast';
      case 'group': return 'Support Group';
      case 'workshop': return 'Workshop';
      default: return type;
    }
  };

  // Open public resources page
  const viewPublicResourcesPage = () => {
    window.open('/resources', '_blank');
  };

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
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={viewPublicResourcesPage}
            >
              <Eye size={16} />
              View Public Page
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
                      {getResourceIcon(resource.type)}
                    </div>
                  )}
                  {resource.featured && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-yellow-500">Featured</Badge>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary">
                      {getResourceTypeLabel(resource.type)}
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
              <Label htmlFor="title">Title</Label>
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
              <Label htmlFor="description">Description</Label>
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
                <Label htmlFor="type">Resource Type</Label>
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
                <Label htmlFor="category">Category</Label>
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
              <Label htmlFor="url">URL (external link or embedded content)</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="Enter URL (optional for documents)"
                value={formData.url}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                name="thumbnail_url"
                type="url"
                placeholder="Enter thumbnail image URL"
                value={formData.thumbnail_url}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500">
                Provide a URL to an image that represents this resource. If left empty, a default image will be used.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>File Upload (for documents or videos)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <Input
                  id="file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi"
                />
                <div className="space-y-2">
                  {uploadedFile ? (
                    <div className="text-sm">
                      <p className="font-medium">{uploadedFile.name}</p>
                      <p className="text-gray-500">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        PDF, Word, PowerPoint, Videos (max 100MB)
                      </p>
                    </>
                  )}
                  <Button
                    type="button"
                    variant={uploadedFile ? "outline" : "secondary"}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2"
                  >
                    {uploadedFile ? "Change File" : "Select File"}
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter className="pt-4">
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Saving...
                  </>
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




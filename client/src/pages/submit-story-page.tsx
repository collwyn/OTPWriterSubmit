import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { SubmissionStepper } from "@/components/forms/submission-stepper";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { insertArticleSchema, Article } from "@shared/schema";
import { ArrowLeft, ArrowRight, Save, Upload, Link, Check, Bold, Italic, Underline, Heading, Quote, List, Image } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const extendedSchema = insertArticleSchema.extend({
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().min(1, "Summary is required").max(500),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  keywords: z.string().optional(),
  targetAudience: z.string().optional(),
  status: z.string().optional(),
  featuredImage: z.string().optional(),
  images: z.string().optional(),
  imageCaptions: z.string().optional(),
  video: z.string().optional(),
  dropboxLink: z.string().optional(),
  wordCount: z.number().optional(),
  imageFiles: z.any().optional(),
  videoFile: z.any().optional(),
});

type FormValues = z.infer<typeof extendedSchema>;

export default function SubmitStoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [imageCaptions, setImageCaptions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get article ID from URL if editing
  const articleId = new URLSearchParams(search).get('id');

  // Fetch article if editing
  const { data: editArticle, isLoading: isLoadingArticle } = useQuery<Article>({
    queryKey: ['/api/articles', articleId],
    enabled: !!articleId,
  });

  useEffect(() => {
    if (articleId && editArticle) {
      setIsEditing(true);

      // If article has images, show previews
      if (editArticle.images) {
        try {
          const imagesList: string[] = JSON.parse(editArticle.images);
          const imageUrls = imagesList.map(img => `/uploads/${img}`);
          setPreviewImageUrls(imageUrls);

          // Handle captions if they exist
          if (editArticle.imageCaptions) {
            try {
              setImageCaptions(JSON.parse(editArticle.imageCaptions));
            } catch (e) {
              setImageCaptions(new Array(imagesList.length).fill(""));
            }
          } else {
            setImageCaptions(new Array(imagesList.length).fill(""));
          }
        } catch (error) {
          console.error('Error parsing images:', error);
        }
      } else if (editArticle.featuredImage) {
        // Backward compatibility for single featured image
        setPreviewImageUrls([`/uploads/${editArticle.featuredImage}`]);
      }

      // If article has video, set preview
      if (editArticle.video) {
        setVideoPreviewUrl(`/uploads/${editArticle.video}`);
        // Note: We don't store the File object for existing videos directly,
        // as it's already on the server. We only handle new uploads.
      }

      // Reset form with article data
      form.reset({
        title: editArticle.title,
        summary: editArticle.summary,
        content: editArticle.content,
        category: editArticle.category,
        keywords: editArticle.keywords || '',
        targetAudience: editArticle.targetAudience || 'general',
        status: editArticle.status,
        imageFiles: undefined, // Clear any existing file inputs
        videoFile: undefined,
      });
    }
  }, [articleId, editArticle]);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(extendedSchema),
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      category: '',
      keywords: '',
      targetAudience: 'general',
      status: 'draft',
      imageFiles: undefined,
      videoFile: undefined,
    },
  });

  // Handle multiple image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    // Check if adding these files would exceed the limit
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > 10) {
      toast({
        title: "Too many files",
        description: `You can upload a maximum of 10 images. You have ${selectedFiles.length} and are trying to add ${files.length} more.`,
        variant: "destructive",
      });
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
        invalidFiles.push(`${file.name} (invalid type)`);
        continue;
      }

      // Validate file size (4MB)
      if (file.size > 4 * 1024 * 1024) {
        invalidFiles.push(`${file.name} (too large)`);
        continue;
      }

      validFiles.push(file);
    }

    // Show error for invalid files
    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were rejected",
        description: `Invalid files: ${invalidFiles.join(', ')}. Only JPG images under 4MB are allowed.`,
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      // Add valid files to existing selection
      const newSelectedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newSelectedFiles);

      // Set form value
      form.setValue('imageFiles', newSelectedFiles);

      // Generate preview URLs for new files
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
      setPreviewImageUrls(prev => [...prev, ...newPreviewUrls]);
      setImageCaptions(prev => [...prev, ...new Array(validFiles.length).fill("")]);
    }
  };

  // Handle video file selection
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type (MP4)
    if (file.type !== 'video/mp4') {
      toast({
        title: "Invalid file type",
        description: "Only MP4 video files are allowed.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5GB)
    if (file.size > 5 * 1024 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video files must be 5GB or smaller.",
        variant: "destructive",
      });
      return;
    }

    setSelectedVideo(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    form.setValue('videoFile', file);
  };


  // Remove image from selection
  const removeImage = (index: number) => {
    const newSelectedFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviewUrls = previewImageUrls.filter((_, i) => i !== index);
    const newCaptions = imageCaptions.filter((_, i) => i !== index);

    setSelectedFiles(newSelectedFiles);
    setPreviewImageUrls(newPreviewUrls);
    setImageCaptions(newCaptions);
    form.setValue('imageFiles', newSelectedFiles.length > 0 ? newSelectedFiles : undefined);
  };

  // Update caption
  const updateCaption = (index: number, caption: string) => {
    const newCaptions = [...imageCaptions];
    newCaptions[index] = caption;
    setImageCaptions(newCaptions);
  };

  // Remove video from selection
  const removeVideo = () => {
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
    form.setValue('videoFile', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the input value
    }
  };

  // Form submission
  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const formData = new FormData();

      // Add text data
      Object.keys(values).forEach(key => {
        if (key !== 'imageFiles' && key !== 'videoFile' && values[key as keyof FormValues] !== undefined) {
          formData.append(key, String(values[key as keyof FormValues]));
        }
      });

      // Add captions
      formData.append('imageCaptions', JSON.stringify(imageCaptions));

      // Add images if available
      if (values.imageFiles && Array.isArray(values.imageFiles)) {
        values.imageFiles.forEach((file: File) => {
          formData.append('images', file);
        });
      }

      // Add video if available
      if (values.videoFile) {
        formData.append('video', values.videoFile);
      }

      // Call API
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/articles/${articleId}`, null, formData);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/articles", null, formData);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });

      toast({
        title: isEditing ? "Story updated successfully" : "Story submitted successfully",
        description: form.getValues('status') === 'underReview'
          ? "Your story has been submitted for review."
          : "Your story has been saved as a draft.",
      });

      navigate('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to handle form submission
  const onSubmit = (values: FormValues) => {
    submitMutation.mutate(values);
  };

  // Function to save as draft
  const saveAsDraft = () => {
    form.setValue('status', 'draft');
    form.handleSubmit(onSubmit)();
  };

  // Function to submit for review
  const submitForReview = () => {
    form.setValue('status', 'underReview');
    form.handleSubmit(onSubmit)();
  };

  // Content for different steps
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story Title <span className="text-secondary">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the title of your story"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-secondary">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">Local News</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="arts">Arts & Culture</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="opinion">Opinion</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary <span className="text-secondary">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief summary of your story (150-200 words)"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be used for preview purposes and SEO. Maximum 200 words.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="climate, environment, policy, etc."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add keywords separated by commas to help categorize your story.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />


          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <FormLabel htmlFor="content">Story Content <span className="text-secondary">*</span></FormLabel>
              <div className="bg-white border border-neutral-light rounded-md shadow-sm">
                <div className="px-3 py-2 border-b border-neutral-light">
                  <div className="flex flex-wrap items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Heading className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Quote className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <List className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Link className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Image className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Textarea
                          id="content"
                          placeholder="Write your story here or paste from a document"
                          className="block w-full min-h-[300px] border-0 focus-visible:ring-0 resize-vertical p-3"
                          rows={12}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Format your content using the toolbar above. You can also paste from Word or Google Docs.
              </p>
              {form.formState.errors.content && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.content.message as string}
                </p>
              )}
            </div>

            <FormItem>
              <FormLabel>Images (up to 10) <span className="text-secondary">*</span></FormLabel>
              <div className="space-y-4">
                {previewImageUrls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {previewImageUrls.map((url, index) => (
                      <div key={index} className="relative group border border-neutral-light rounded-md overflow-hidden">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          ×
                        </Button>
                        <div className="p-2 bg-neutral-50 border-t border-neutral-light">
                          <Input
                            placeholder="Add a caption..."
                            className="h-7 text-xs"
                            value={imageCaptions[index] || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCaption(index, e.target.value)}
                          />
                        </div>
                        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] p-0.5 text-center">
                          {index + 1} of {previewImageUrls.length}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {previewImageUrls.length < 10 && (
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-light border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Image className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="flex text-sm text-muted-foreground">
                        <label
                          htmlFor="image-file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                        >
                          <span>Upload images</span>
                          <input
                            id="image-file-upload"
                            name="image-file-upload"
                            type="file"
                            multiple
                            className="sr-only"
                            onChange={handleImageFileChange}
                            accept=".jpg,.jpeg"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        JPG only, up to 4MB each, maximum 10 images
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Current: {previewImageUrls.length}/10 images
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {form.formState.errors.imageFiles && (
                <p className="text-destructive text-sm mt-1">
                  {form.formState.errors.imageFiles.message as string}
                </p>
              )}
            </FormItem>

            <FormItem>
              <FormLabel>Video (MP4, up to 5GB) <span className="text-secondary">*</span></FormLabel>
              <div className="space-y-4">
                {videoPreviewUrl && (
                  <div className="relative group border border-neutral-light rounded-md overflow-hidden">
                    <video src={videoPreviewUrl} controls className="w-full max-h-48 object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeVideo}
                    >
                      ×
                    </Button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                      {selectedVideo?.name || 'Video'}
                    </div>
                  </div>
                )}

                {!videoPreviewUrl && (
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-light border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="flex text-sm text-muted-foreground">
                        <label
                          htmlFor="video-file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                        >
                          <span>Upload video</span>
                          <input
                            id="video-file-upload"
                            name="video-file-upload"
                            type="file"
                            className="sr-only"
                            ref={fileInputRef}
                            onChange={handleVideoFileChange}
                            accept=".mp4"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        MP4 only, up to 5GB
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {form.formState.errors.videoFile && (
                <p className="text-destructive text-sm mt-1">
                  {form.formState.errors.videoFile.message as string}
                </p>
              )}
            </FormItem>

            <FormItem>
              <FormLabel>Dropbox Integration</FormLabel>
              <div className="mt-1 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="text-blue-500 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L6 7l6 5-6 5 6 5 6-5-6-5 6-5-6-5zm6 10l-6 5-6-5 6-5-6-5 6 5 6-5 6 5-6 5z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-blue-700">
                      You can link additional resources from your Dropbox folder
                    </p>
                  </div>
                  <div>
                    <Button type="button" variant="outline" className="text-blue-700 bg-blue-100 hover:bg-blue-200 border-blue-200">
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            </FormItem>
          </div>
        );
      case 3:
        // Review & Submit
        return (
          <div className="space-y-8">
            <div className="border border-neutral-light rounded-lg overflow-hidden">
              <div className="bg-neutral-lightest px-4 py-3 border-b border-neutral-light flex justify-between items-center">
                <h3 className="font-medium text-neutral-dark">Story Details</h3>
                <Button
                  type="button"
                  variant="link"
                  className="text-primary hover:text-primary/80 p-0 h-auto"
                  onClick={() => setStep(1)}
                >
                  Edit
                </Button>
              </div>
              <div className="p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Title</dt>
                    <dd className="mt-1 text-neutral-dark font-medium">{form.getValues('title')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="mt-1 text-neutral-dark">
                      {form.getValues('category') === 'local' && 'Local News'}
                      {form.getValues('category') === 'business' && 'Business'}
                      {form.getValues('category') === 'technology' && 'Technology'}
                      {form.getValues('category') === 'arts' && 'Arts & Culture'}
                      {form.getValues('category') === 'sports' && 'Sports'}
                      {form.getValues('category') === 'opinion' && 'Opinion'}
                      {form.getValues('category') === 'lifestyle' && 'Lifestyle'}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-muted-foreground">Summary</dt>
                    <dd className="mt-1 text-neutral-dark">{form.getValues('summary')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Keywords</dt>
                    <dd className="mt-1 text-neutral-dark">{form.getValues('keywords') || 'None'}</dd>
                  </div>

                </dl>
              </div>
            </div>

            <div className="border border-neutral-light rounded-lg overflow-hidden">
              <div className="bg-neutral-lightest px-4 py-3 border-b border-neutral-light flex justify-between items-center">
                <h3 className="font-medium text-neutral-dark">Content Preview</h3>
                <Button
                  type="button"
                  variant="link"
                  className="text-primary hover:text-primary/80 p-0 h-auto"
                  onClick={() => setStep(2)}
                >
                  Edit
                </Button>
              </div>
              <div className="p-4">
                <div className="prose max-w-none">
                  <h4 className="text-neutral-dark font-medium">Preview of your article:</h4>
                  <p className="text-neutral-dark mt-2">
                    {form.getValues('content')?.substring(0, 200)}...
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Total word count: Approximately {form.getValues('content')?.split(/\s+/).filter(Boolean).length || 0} words
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-neutral-light rounded-lg overflow-hidden">
              <div className="bg-neutral-lightest px-4 py-3 border-b border-neutral-light flex justify-between items-center">
                <h3 className="font-medium text-neutral-dark">Media Files</h3>
                <Button
                  type="button"
                  variant="link"
                  className="text-primary hover:text-primary/80 p-0 h-auto"
                  onClick={() => setStep(2)}
                >
                  Edit
                </Button>
              </div>
              <div className="p-4">
                <h4 className="text-sm font-medium text-neutral-dark mb-3">Images ({previewImageUrls.length}/10)</h4>
                {previewImageUrls.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewImageUrls.map((url, index) => (
                      <div key={index} className="border border-neutral-light rounded-md overflow-hidden">
                        <img src={url} alt={`Image ${index + 1}`} className="w-full h-24 object-cover" />
                        <div className="p-2">
                          <p className="text-xs text-neutral-dark font-medium truncate">
                            {isEditing && selectedFiles.length === 0
                              ? `Image ${index + 1}`
                              : selectedFiles[index]?.name || `Image ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {index === 0 && '(Featured)'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No images selected.</p>
                )}

                <h4 className="text-sm font-medium text-neutral-dark mt-6 mb-3">Video</h4>
                {videoPreviewUrl ? (
                  <div className="border border-neutral-light rounded-md overflow-hidden">
                    <video src={videoPreviewUrl} controls className="w-full max-h-48" />
                    <div className="p-2">
                      <p className="text-xs text-neutral-dark font-medium truncate">
                        {selectedVideo?.name || 'Video file'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No video selected.</p>
                )}

                <h4 className="text-sm font-medium text-neutral-dark mt-6 mb-3">Dropbox Integration</h4>
                <p className="text-sm text-muted-foreground">Not connected.</p>
              </div>
            </div>

            <div className="border border-neutral-light rounded-lg overflow-hidden">
              <div className="bg-neutral-lightest px-4 py-3 border-b border-neutral-light">
                <h3 className="font-medium text-neutral-dark">Submission Agreement</h3>
              </div>
              <div className="p-4">
                <div className="flex items-start mb-4">
                  <Checkbox id="terms" className="mt-0.5" required />
                  <div className="ml-3">
                    <label htmlFor="terms" className="text-neutral-dark text-sm">
                      I confirm that this work is original and does not infringe on any copyrights
                    </label>
                    <p className="text-muted-foreground text-sm mt-1">
                      By submitting, you grant Our Time Press non-exclusive rights to publish this content in print and digital formats.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Checkbox id="editorial" className="mt-0.5" required />
                  <div className="ml-3">
                    <label htmlFor="editorial" className="text-neutral-dark text-sm">
                      I understand that editorial staff may request revisions
                    </label>
                    <p className="text-muted-foreground text-sm mt-1">
                      Our editors may suggest changes to improve readability, accuracy, or style consistency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-lightest">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-neutral-dark mb-2">
              {isEditing ? 'Edit Story' : 'Submit a New Story'}
            </h2>
            <p className="text-muted-foreground">
              {isEditing
                ? 'Update your story details below'
                : 'Complete the form below to submit your story for review'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <SubmissionStepper currentStep={step} />

              <Form {...form}>
                <form>
                  {renderStepContent()}

                  <div className="mt-8 flex justify-between">
                    {step > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(step - 1)}
                        className="text-muted-foreground border-neutral-light hover:text-primary hover:border-primary"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span>Previous</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={saveAsDraft}
                        className="text-muted-foreground border-neutral-light hover:text-primary hover:border-primary"
                        disabled={submitMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        <span>Save as Draft</span>
                      </Button>
                    )}

                    {step < 3 ? (
                      <Button
                        type="button"
                        onClick={() => setStep(step + 1)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <span>Next</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={submitForReview}
                        className="bg-secondary hover:bg-secondary/90"
                        disabled={submitMutation.isPending}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        <span>Submit Story</span>
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
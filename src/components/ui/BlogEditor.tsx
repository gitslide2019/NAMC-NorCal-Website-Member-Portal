'use client';

import React, { useState, useRef } from 'react';
import { Save, Eye, Image, Link, Bold, Italic, List, Quote, Code } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface BlogEditorProps {
  initialData?: {
    title?: string;
    content?: string;
    description?: string;
    featuredImage?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    categoryIds?: string[];
    tagIds?: string[];
    status?: 'draft' | 'review' | 'published';
    isPublic?: boolean;
    isFeatured?: boolean;
    allowComments?: boolean;
  };
  categories?: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
  onSave?: (data: any) => void;
  onPreview?: (data: any) => void;
  isLoading?: boolean;
}

export function BlogEditor({
  initialData = {},
  categories = [],
  tags = [],
  onSave,
  onPreview,
  isLoading = false
}: BlogEditorProps) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    content: initialData.content || '',
    description: initialData.description || '',
    featuredImage: initialData.featuredImage || '',
    seoTitle: initialData.seoTitle || '',
    seoDescription: initialData.seoDescription || '',
    seoKeywords: initialData.seoKeywords || '',
    categoryIds: initialData.categoryIds || [],
    tagIds: initialData.tagIds || [],
    status: initialData.status || 'draft',
    isPublic: initialData.isPublic ?? true,
    isFeatured: initialData.isFeatured ?? false,
    allowComments: initialData.allowComments ?? true
  });

  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'settings'>('content');
  const [showPreview, setShowPreview] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: checked
        ? [...prev.categoryIds, categoryId]
        : prev.categoryIds.filter(id => id !== categoryId)
    }));
  };

  const handleTagChange = (tagId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tagIds: checked
        ? [...prev.tagIds, tagId]
        : prev.tagIds.filter(id => id !== tagId)
    }));
  };

  const insertTextAtCursor = (text: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = formData.content;
    
    const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
    
    handleInputChange('content', newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const formatText = (format: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);

    let formattedText = '';
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`;
        break;
      case 'link':
        formattedText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'image':
        formattedText = `![${selectedText || 'alt text'}](image-url)`;
        break;
      case 'quote':
        formattedText = `> ${selectedText || 'quote text'}`;
        break;
      case 'code':
        formattedText = `\`${selectedText || 'code'}\``;
        break;
      case 'list':
        formattedText = `- ${selectedText || 'list item'}`;
        break;
      default:
        return;
    }

    insertTextAtCursor(formattedText);
  };

  const handleSave = (status?: string) => {
    const dataToSave = {
      ...formData,
      ...(status && { status })
    };
    onSave?.(dataToSave);
  };

  const handlePreview = () => {
    setShowPreview(!showPreview);
    if (!showPreview) {
      onPreview?.(formData);
    }
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering for preview
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Blog Editor
          </h2>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Edit' : 'Preview'}</span>
            </Button>
            <Button
              onClick={() => handleSave('draft')}
              disabled={isLoading}
              variant="outline"
            >
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave('published')}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              <Save className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'content', label: 'Content' },
            { id: 'seo', label: 'SEO' },
            { id: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter blog post title..."
                className="text-lg font-semibold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the blog post..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Featured Image URL
              </label>
              <Input
                value={formData.featuredImage}
                onChange={(e) => handleInputChange('featuredImage', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {showPreview ? (
              /* Preview Mode */
              <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
                <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                  {formData.title || 'Untitled Post'}
                </h1>
                {formData.featuredImage && (
                  <img
                    src={formData.featuredImage}
                    alt="Featured"
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(formData.content || 'No content yet...')
                  }}
                />
              </div>
            ) : (
              /* Editor Mode */
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Content
                  </label>
                  
                  {/* Formatting Toolbar */}
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('bold')}
                      className="p-2"
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('italic')}
                      className="p-2"
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('link')}
                      className="p-2"
                    >
                      <Link className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('image')}
                      className="p-2"
                    >
                      <Image className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('quote')}
                      className="p-2"
                    >
                      <Quote className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('code')}
                      className="p-2"
                    >
                      <Code className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('list')}
                      className="p-2"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <textarea
                  ref={contentRef}
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Write your blog post content here... (Markdown supported)"
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SEO Title
              </label>
              <Input
                value={formData.seoTitle}
                onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                placeholder="SEO optimized title (60 characters max)"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.seoTitle.length}/60 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SEO Description
              </label>
              <textarea
                value={formData.seoDescription}
                onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                placeholder="SEO meta description (160 characters max)"
                rows={3}
                maxLength={160}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.seoDescription.length}/160 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SEO Keywords
              </label>
              <Input
                value={formData.seoKeywords}
                onChange={(e) => handleInputChange('seoKeywords', e.target.value)}
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Categories
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.categoryIds.includes(category.id)}
                        onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                        className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tags
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tags.map(tag => (
                    <label key={tag.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.tagIds.includes(tag.id)}
                        onChange={(e) => handleTagChange(tag.id, e.target.checked)}
                        className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {tag.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Make this post public
                </span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Feature this post
                </span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.allowComments}
                  onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Allow comments
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
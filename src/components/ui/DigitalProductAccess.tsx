/**
 * Digital Product Access Component
 * Handles digital product delivery and access management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Play, 
  FileText, 
  Video, 
  Music, 
  Archive,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface DigitalProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  productType: 'course' | 'ebook' | 'video' | 'audio' | 'software' | 'template' | 'guide';
  accessLevel: 'FULL' | 'PREVIEW' | 'EXPIRED';
  purchaseDate: string;
  expirationDate?: string;
  downloadCount: number;
  maxDownloads?: number;
  fileSize?: number;
  duration?: number; // For video/audio content
  progress?: number; // For courses or tracked content
  lastAccessed?: string;
  files: DigitalFile[];
  metadata?: {
    author?: string;
    version?: string;
    format?: string;
    language?: string;
    requirements?: string[];
  };
}

interface DigitalFile {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'audio' | 'zip' | 'doc' | 'ppt' | 'xls' | 'other';
  size: number;
  url?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  isPreview: boolean;
  requiresAuth: boolean;
}

interface DigitalProductAccessProps {
  memberId: string;
  className?: string;
}

export function DigitalProductAccess({ memberId, className = '' }: DigitalProductAccessProps) {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [streamingFile, setStreamingFile] = useState<string | null>(null);

  useEffect(() => {
    fetchDigitalProducts();
  }, [memberId]);

  const fetchDigitalProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shop/digital-access?memberId=${memberId}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.error || 'Failed to fetch digital products');
      }
    } catch (err) {
      setError('Failed to fetch digital products');
      console.error('Error fetching digital products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (product: DigitalProduct, file: DigitalFile) => {
    if (product.accessLevel !== 'FULL' && !file.isPreview) {
      setError('Access denied. Please check your subscription or purchase status.');
      return;
    }

    if (product.maxDownloads && product.downloadCount >= product.maxDownloads) {
      setError('Download limit reached for this product.');
      return;
    }

    try {
      setDownloadingFiles(prev => new Set(prev).add(file.id));

      const response = await fetch('/api/shop/digital-access/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          fileId: file.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Update download count
        setProducts(prev => prev.map(p => 
          p.id === product.id 
            ? { ...p, downloadCount: p.downloadCount + 1, lastAccessed: new Date().toISOString() }
            : p
        ));
      } else {
        setError(data.error || 'Failed to download file');
      }
    } catch (err) {
      setError('Failed to download file');
      console.error('Error downloading file:', err);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const handleStream = async (product: DigitalProduct, file: DigitalFile) => {
    if (product.accessLevel !== 'FULL' && !file.isPreview) {
      setError('Access denied. Please check your subscription or purchase status.');
      return;
    }

    try {
      setStreamingFile(file.id);

      const response = await fetch('/api/shop/digital-access/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          fileId: file.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Open streaming URL in new window or embedded player
        if (file.type === 'video' || file.type === 'audio') {
          // For video/audio, you might want to use an embedded player
          window.open(data.streamUrl, '_blank');
        } else {
          // For other files, open in new tab
          window.open(data.streamUrl, '_blank');
        }

        // Update last accessed
        setProducts(prev => prev.map(p => 
          p.id === product.id 
            ? { ...p, lastAccessed: new Date().toISOString() }
            : p
        ));
      } else {
        setError(data.error || 'Failed to stream file');
      }
    } catch (err) {
      setError('Failed to stream file');
      console.error('Error streaming file:', err);
    } finally {
      setStreamingFile(null);
    }
  };

  const updateProgress = async (productId: string, progress: number) => {
    try {
      const response = await fetch('/api/shop/digital-access/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          progress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, progress } : p
        ));
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
      case 'doc':
        return FileText;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      case 'zip':
        return Archive;
      default:
        return FileText;
    }
  };

  const getProductTypeIcon = (productType: string) => {
    switch (productType) {
      case 'course':
        return Play;
      case 'ebook':
        return FileText;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      case 'software':
        return Archive;
      default:
        return FileText;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isExpired = (product: DigitalProduct) => {
    return product.expirationDate && new Date(product.expirationDate) < new Date();
  };

  const canAccess = (product: DigitalProduct, file: DigitalFile) => {
    if (file.isPreview) return true;
    if (isExpired(product)) return false;
    return product.accessLevel === 'FULL';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-2 text-gray-600">Loading digital library...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => setError(null)} variant="outline">
          Dismiss
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Digital Library</h2>
          <p className="text-gray-600">Access your purchased digital content</p>
        </div>
        <Button onClick={fetchDigitalProducts} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {products.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Digital Products</h3>
          <p className="text-gray-600">You haven't purchased any digital products yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {products.map(product => {
            const ProductIcon = getProductTypeIcon(product.productType);
            const expired = isExpired(product);
            
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="p-6">
                  {/* Product Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        expired ? 'bg-red-100' : 
                        product.accessLevel === 'FULL' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <ProductIcon className={`h-6 w-6 ${
                          expired ? 'text-red-600' : 
                          product.accessLevel === 'FULL' ? 'text-green-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {product.category} • {product.productType}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {expired ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Lock className="h-3 w-3 mr-1" />
                          Expired
                        </span>
                      ) : product.accessLevel === 'FULL' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Unlock className="h-3 w-3 mr-1" />
                          Full Access
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Preview
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Description */}
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Progress Bar (for courses) */}
                  {product.productType === 'course' && product.progress !== undefined && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(product.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${product.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Product Metadata */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Purchased:</span>
                      <br />
                      {new Date(product.purchaseDate).toLocaleDateString()}
                    </div>
                    {product.expirationDate && (
                      <div>
                        <span className="font-medium">Expires:</span>
                        <br />
                        {new Date(product.expirationDate).toLocaleDateString()}
                      </div>
                    )}
                    {product.duration && (
                      <div>
                        <span className="font-medium">Duration:</span>
                        <br />
                        {formatDuration(product.duration)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Downloads:</span>
                      <br />
                      {product.downloadCount}{product.maxDownloads ? `/${product.maxDownloads}` : ''}
                    </div>
                  </div>

                  {/* Files List */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Files</h4>
                    {product.files.map(file => {
                      const FileIcon = getFileIcon(file.type);
                      const canAccessFile = canAccess(product, file);
                      const isDownloading = downloadingFiles.has(file.id);
                      const isStreaming = streamingFile === file.id;

                      return (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {file.name}
                                {file.isPreview && (
                                  <span className="ml-2 text-xs text-blue-600">(Preview)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Stream/View Button */}
                            {(file.type === 'video' || file.type === 'audio' || file.type === 'pdf') && (
                              <Button
                                onClick={() => handleStream(product, file)}
                                disabled={!canAccessFile || isStreaming}
                                variant="ghost"
                                size="sm"
                              >
                                {isStreaming ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {/* Download Button */}
                            <Button
                              onClick={() => handleDownload(product, file)}
                              disabled={!canAccessFile || isDownloading}
                              variant="ghost"
                              size="sm"
                            >
                              {isDownloading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>

                            {/* External Link Button */}
                            {file.url && (
                              <Button
                                onClick={() => window.open(file.url, '_blank')}
                                disabled={!canAccessFile}
                                variant="ghost"
                                size="sm"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Last Accessed */}
                  {product.lastAccessed && (
                    <div className="mt-4 text-xs text-gray-500">
                      Last accessed: {new Date(product.lastAccessed).toLocaleString()}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DigitalProductAccess;
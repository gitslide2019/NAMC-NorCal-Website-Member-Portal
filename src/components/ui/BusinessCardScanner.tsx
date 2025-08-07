'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, Edit3, User, Building, Mail, Phone, Globe, MapPin, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { useOCRScanner } from '@/hooks/useOCRScanner';
import { BusinessCardData, OCRExtractedData } from '@/lib/services/ocr-business-card.service';

interface BusinessCardScannerProps {
  onContactCreated?: (contactId: string) => void;
  onClose?: () => void;
}

export function BusinessCardScanner({ onContactCreated, onClose }: BusinessCardScannerProps) {
  const [scanMode, setScanMode] = useState<'upload' | 'camera'>('upload');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<OCRExtractedData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const {
    isScanning,
    isCreatingContact,
    currentCard,
    error,
    scanBusinessCard,
    updateBusinessCard,
    createContact,
    clearError,
  } = useOCRScanner();

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await scanBusinessCard(file);
    }
  }, [scanBusinessCard]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'business-card.jpg', { type: 'image/jpeg' });
        await scanBusinessCard(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  }, [scanBusinessCard, stopCamera]);

  // Handle edit mode
  const handleEdit = useCallback(() => {
    if (currentCard) {
      setEditedData({
        firstName: currentCard.firstName || '',
        lastName: currentCard.lastName || '',
        company: currentCard.company || '',
        title: currentCard.title || '',
        email: currentCard.email || '',
        phone: currentCard.phone || '',
        website: currentCard.website || '',
        address: currentCard.address || '',
      });
      setIsEditing(true);
    }
  }, [currentCard]);

  // Save edited data
  const handleSaveEdit = useCallback(async () => {
    if (currentCard) {
      const updated = await updateBusinessCard(currentCard.id, editedData);
      if (updated) {
        setIsEditing(false);
        setEditedData({});
      }
    }
  }, [currentCard, editedData, updateBusinessCard]);

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData({});
  }, []);

  // Create contact
  const handleCreateContact = useCallback(async () => {
    if (currentCard) {
      const result = await createContact(currentCard.id, isEditing ? editedData : undefined);
      if (result?.success && result.contactId) {
        onContactCreated?.(result.contactId);
      }
    }
  }, [currentCard, createContact, editedData, isEditing, onContactCreated]);

  // Switch scan mode
  const handleScanModeChange = useCallback((mode: 'upload' | 'camera') => {
    setScanMode(mode);
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [startCamera, stopCamera]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Card Scanner</h1>
          <p className="text-gray-600">Scan business cards to automatically extract contact information</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-red-800">
              <X className="w-5 h-5 mr-2" />
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanning Interface */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Scan Business Card</h2>
          
          {/* Mode Selection */}
          <div className="flex space-x-2 mb-4">
            <Button
              variant={scanMode === 'upload' ? 'default' : 'outline'}
              onClick={() => handleScanModeChange('upload')}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              onClick={() => handleScanModeChange('camera')}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Use Camera
            </Button>
          </div>

          {/* Upload Interface */}
          {scanMode === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Click to upload a business card image or drag and drop
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select Image
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Camera Interface */}
          {scanMode === 'camera' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                {stream && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Button
                      onClick={capturePhoto}
                      disabled={isScanning}
                      className="bg-white text-black hover:bg-gray-100"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Capture
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Results Display */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Extracted Information</h2>
            {currentCard && !currentCard.contactCreated && (
              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {!currentCard ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Scan a business card to see extracted information</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Confidence Score */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Confidence Score:</span>
                <span className={`font-medium ${
                  (currentCard.ocrConfidence || 0) > 0.8 ? 'text-green-600' :
                  (currentCard.ocrConfidence || 0) > 0.6 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {Math.round((currentCard.ocrConfidence || 0) * 100)}%
                </span>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <Input
                          placeholder="First Name"
                          value={editedData.firstName || ''}
                          onChange={(e) => setEditedData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                        <Input
                          placeholder="Last Name"
                          value={editedData.lastName || ''}
                          onChange={(e) => setEditedData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                    ) : (
                      <p className="font-medium">
                        {currentCard.firstName} {currentCard.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        placeholder="Company"
                        value={editedData.company || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, company: e.target.value }))}
                      />
                    ) : (
                      <p>{currentCard.company || 'Not detected'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        placeholder="Title"
                        value={editedData.title || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    ) : (
                      <p>{currentCard.title || 'Not detected'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        placeholder="Email"
                        type="email"
                        value={editedData.email || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    ) : (
                      <p>{currentCard.email || 'Not detected'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        placeholder="Phone"
                        type="tel"
                        value={editedData.phone || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    ) : (
                      <p>{currentCard.phone || 'Not detected'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        placeholder="Website"
                        type="url"
                        value={editedData.website || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, website: e.target.value }))}
                      />
                    ) : (
                      <p>{currentCard.website || 'Not detected'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        placeholder="Address"
                        value={editedData.address || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, address: e.target.value }))}
                      />
                    ) : (
                      <p>{currentCard.address || 'Not detected'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t">
                {currentCard.contactCreated ? (
                  <div className="flex items-center justify-center text-green-600">
                    <Check className="w-5 h-5 mr-2" />
                    Contact created successfully
                  </div>
                ) : (
                  <Button
                    onClick={handleCreateContact}
                    disabled={isCreatingContact}
                    className="w-full"
                  >
                    {isCreatingContact ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Contact...
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />
                        Create Contact
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
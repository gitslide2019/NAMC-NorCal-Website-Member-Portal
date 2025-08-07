'use client';

import React, { useEffect, useState } from 'react';
import { BusinessCardScanner } from '@/components/ui/BusinessCardScanner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useOCRScanner } from '@/hooks/useOCRScanner';
import { BusinessCardData } from '@/lib/services/ocr-business-card.service';
import { User, Building, Mail, Phone, Calendar, Trash2, Eye, UserPlus, MessageCircle, Briefcase } from 'lucide-react';

export default function ScannerPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BusinessCardData | null>(null);
  
  const {
    businessCards,
    networkingOpportunities,
    isProcessing,
    getBusinessCards,
    getNetworkingOpportunities,
    inviteToMembership,
    createNetworkingTask,
    deleteBusinessCard,
  } = useOCRScanner();

  useEffect(() => {
    getBusinessCards();
    getNetworkingOpportunities();
  }, [getBusinessCards, getNetworkingOpportunities]);

  const handleContactCreated = (contactId: string) => {
    // Refresh the business cards list and networking opportunities
    getBusinessCards();
    getNetworkingOpportunities();
    setShowScanner(false);
  };

  const handleInviteToMembership = async (businessCardId: string) => {
    const success = await inviteToMembership(businessCardId);
    if (success) {
      getBusinessCards();
      getNetworkingOpportunities();
    }
  };

  const handleCreateTask = async (businessCardId: string, taskType: string = 'follow_up') => {
    const success = await createNetworkingTask(businessCardId, taskType);
    if (success) {
      getNetworkingOpportunities();
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (confirm('Are you sure you want to delete this business card?')) {
      await deleteBusinessCard(id);
    }
  };

  const handleViewCard = (card: BusinessCardData) => {
    setSelectedCard(card);
  };

  if (showScanner) {
    return (
      <BusinessCardScanner
        onContactCreated={handleContactCreated}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Card Scanner</h1>
          <p className="text-gray-600">Scan and manage business cards from networking events</p>
        </div>
        <Button onClick={() => setShowScanner(true)}>
          Scan New Card
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Cards</p>
              <p className="text-2xl font-bold">{businessCards.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Contacts Created</p>
              <p className="text-2xl font-bold">
                {businessCards.filter(card => card.contactCreated).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold">
                {businessCards.filter(card => {
                  const cardDate = new Date(card.createdAt);
                  const now = new Date();
                  return cardDate.getMonth() === now.getMonth() && 
                         cardDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Networking Opportunities */}
      {networkingOpportunities && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Scans */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Recent Scans
            </h3>
            {networkingOpportunities.recentScans.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent scans</p>
            ) : (
              <div className="space-y-2">
                {networkingOpportunities.recentScans.map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{card.firstName} {card.lastName}</p>
                      <p className="text-xs text-gray-600">{card.company}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateTask(card.id, 'follow_up')}
                    >
                      <MessageCircle className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pending Follow-ups */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-yellow-600" />
              Pending Follow-ups
            </h3>
            {networkingOpportunities.pendingFollowUps.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending follow-ups</p>
            ) : (
              <div className="space-y-2">
                {networkingOpportunities.pendingFollowUps.map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{card.firstName} {card.lastName}</p>
                      <p className="text-xs text-gray-600">{card.company}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateTask(card.id, 'follow_up')}
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateTask(card.id, 'project_discussion')}
                      >
                        <Briefcase className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Potential Members */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-green-600" />
              Potential Members
            </h3>
            {networkingOpportunities.potentialMembers.length === 0 ? (
              <p className="text-gray-500 text-sm">No potential members</p>
            ) : (
              <div className="space-y-2">
                {networkingOpportunities.potentialMembers.map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{card.firstName} {card.lastName}</p>
                      <p className="text-xs text-gray-600">{card.company}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInviteToMembership(card.id)}
                    >
                      <UserPlus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Business Cards List */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Scanned Business Cards</h2>
        
        {isProcessing ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading business cards...</p>
          </div>
        ) : businessCards.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No business cards scanned yet</p>
            <Button onClick={() => setShowScanner(true)}>
              Scan Your First Card
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessCards.map((card) => (
              <Card key={card.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {card.firstName} {card.lastName}
                      </h3>
                      {card.title && (
                        <p className="text-sm text-gray-600">{card.title}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {card.contactCreated && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Contact Created" />
                      )}
                      <div className={`text-xs px-2 py-1 rounded ${
                        (card.ocrConfidence || 0) > 0.8 ? 'bg-green-100 text-green-800' :
                        (card.ocrConfidence || 0) > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {Math.round((card.ocrConfidence || 0) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Company */}
                  {card.company && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="w-4 h-4 mr-2" />
                      {card.company}
                    </div>
                  )}

                  {/* Email */}
                  {card.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {card.email}
                    </div>
                  )}

                  {/* Phone */}
                  {card.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {card.phone}
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(card.createdAt).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCard(card)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {card.contactCreated && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateTask(card.id, 'follow_up')}
                            title="Create follow-up task"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          {card.company && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInviteToMembership(card.id)}
                              title="Invite to membership"
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Business Card Details</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCard(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{selectedCard.firstName} {selectedCard.lastName}</p>
              </div>
              
              {selectedCard.company && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Company</label>
                  <p className="text-gray-900">{selectedCard.company}</p>
                </div>
              )}
              
              {selectedCard.title && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  <p className="text-gray-900">{selectedCard.title}</p>
                </div>
              )}
              
              {selectedCard.email && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedCard.email}</p>
                </div>
              )}
              
              {selectedCard.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{selectedCard.phone}</p>
                </div>
              )}
              
              {selectedCard.website && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Website</label>
                  <p className="text-gray-900">{selectedCard.website}</p>
                </div>
              )}
              
              {selectedCard.address && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <p className="text-gray-900">{selectedCard.address}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Confidence Score</label>
                <p className="text-gray-900">{Math.round((selectedCard.ocrConfidence || 0) * 100)}%</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className={`font-medium ${selectedCard.contactCreated ? 'text-green-600' : 'text-yellow-600'}`}>
                  {selectedCard.contactCreated ? 'Contact Created' : 'Pending Contact Creation'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
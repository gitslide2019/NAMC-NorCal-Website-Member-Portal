/**
 * Member Shop Page
 * Displays products with member pricing and exclusive access
 */

'use client';

import React, { useState } from 'react';
import { ShoppingCart, Package, Star, Gift } from 'lucide-react';
import ProductCatalog from '@/components/ui/ProductCatalog';
import DigitalProductAccess from '@/components/ui/DigitalProductAccess';
import MemberOrderStatus from '@/components/ui/MemberOrderStatus';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useShoppingCart } from '@/components/ui/ShoppingCart';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number;
  publicPrice: number;
  memberPrice?: number;
  isDigital: boolean;
  isActive: boolean;
  inventory: number;
  imageUrl?: string;
  specifications?: any;
}

export default function MemberShopPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'catalog' | 'digital' | 'orders'>('catalog');
  const { addToCart, getCartCount } = useShoppingCart();

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.publicPrice,
      memberPrice: product.memberPrice,
      image: product.imageUrl,
      isDigital: product.isDigital
    });
  };

  const handleProductSelect = (product: Product) => {
    // Navigate to product details or open modal
    console.log('Selected product:', product);
  };

  const handleGoToCart = () => {
    router.push('/member/shop/checkout');
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Member Access Required
          </h2>
          <p className="text-gray-600 mb-4">
            Please sign in to access the member shop with exclusive pricing and products.
          </p>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Member Shop</h1>
              <p className="text-gray-600 mt-1">
                Exclusive member pricing and professional resources
              </p>
            </div>

            {/* Cart Summary */}
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <div className="flex items-center text-yellow-800">
                  <Star className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Member Benefits Active</span>
                </div>
              </div>

              <div className="relative">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleGoToCart}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Cart ({getCartCount()})
                </Button>
                {getCartCount() > 0 && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartCount()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'catalog'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Product Catalog
              </button>
              <button
                onClick={() => setActiveTab('digital')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'digital'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Digital Library
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Order History
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalog' && (
          <div>
            {/* Member Benefits Banner */}
            <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-yellow-500 rounded-full p-3">
                      <Gift className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Member Exclusive Benefits
                      </h3>
                      <p className="text-gray-600">
                        Enjoy special pricing, exclusive products, and priority access to new releases
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-600">10%</div>
                    <div className="text-sm text-gray-600">Average Savings</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Product Catalog */}
            <ProductCatalog
              isMember={true}
              onAddToCart={handleAddToCart}
              onProductSelect={handleProductSelect}
            />
          </div>
        )}

        {activeTab === 'digital' && (
          <DigitalProductAccess />
        )}

        {activeTab === 'orders' && (
          <MemberOrderStatus />
        )}
      </div>
    </div>
  );
}
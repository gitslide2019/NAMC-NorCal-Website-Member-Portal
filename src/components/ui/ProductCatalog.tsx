/**
 * Product Catalog Component
 * Displays products with public/member pricing, search, and filtering
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Grid, List, ShoppingCart, Star, Package, Tag } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number; // This will be either publicPrice or memberPrice based on user status
  publicPrice: number;
  memberPrice?: number;
  isDigital: boolean;
  isActive: boolean;
  inventory: number;
  imageUrl?: string;
  specifications?: {
    vendor?: string;
    tags?: string;
    variants?: number;
    options?: any[];
    printify?: boolean;
    shopifyProductId?: string;
    printifyProductId?: string;
  };
  shopifyProductId?: string;
  printifyProductId?: string;
}

interface ProductCatalogProps {
  isMember?: boolean;
  onAddToCart?: (product: Product, quantity: number) => void;
  onProductSelect?: (product: Product) => void;
  className?: string;
}

export function ProductCatalog({
  isMember = false,
  onAddToCart,
  onProductSelect,
  className = '',
}: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [showDigitalOnly, setShowDigitalOnly] = useState(false);
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shop');
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
        
        // Set initial price range based on available products
        if (data.data.length > 0) {
          const prices = data.data.map((p: Product) => p.price);
          setPriceRange({
            min: Math.floor(Math.min(...prices)),
            max: Math.ceil(Math.max(...prices)),
          });
        }
      } else {
        setError(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      setError('Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    return uniqueCategories.sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Search term filter
      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

      // Price range filter
      const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max;

      // Digital filter
      const matchesDigital = !showDigitalOnly || product.isDigital;

      // Stock filter
      const matchesStock = !showInStockOnly || product.inventory > 0 || product.isDigital || product.printifyProductId;

      return matchesSearch && matchesCategory && matchesPrice && matchesDigital && matchesStock;
    });

    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, sortBy, sortOrder, priceRange, showDigitalOnly, showInStockOnly]);

  const handleAddToCart = (product: Product) => {
    if (onAddToCart) {
      onAddToCart(product, 1);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStockStatus = (product: Product) => {
    if (product.isDigital || product.printifyProductId) {
      return { status: 'available', text: 'Digital/Print-on-Demand' };
    }
    
    if (product.inventory > 10) {
      return { status: 'in-stock', text: 'In Stock' };
    } else if (product.inventory > 0) {
      return { status: 'low-stock', text: `${product.inventory} left` };
    } else {
      return { status: 'out-of-stock', text: 'Out of Stock' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-2 text-gray-600">Loading products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={fetchProducts} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isMember ? 'Member Shop' : 'NAMC Shop'}
          </h2>
          <p className="text-gray-600">
            {isMember 
              ? 'Exclusive member pricing and products' 
              : 'Professional resources and merchandise'
            }
          </p>
        </div>
        
        {isMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <div className="flex items-center text-yellow-800">
              <Star className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Member Pricing Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search products, categories, or SKUs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Sort Controls */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'name' | 'price' | 'category');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="price-asc">Price Low-High</option>
            <option value="price-desc">Price High-Low</option>
            <option value="category-asc">Category A-Z</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="p-4 space-y-4">
            <h3 className="font-medium text-gray-900">Advanced Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    className="w-20"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Digital Products Filter */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showDigitalOnly}
                    onChange={(e) => setShowDigitalOnly(e.target.checked)}
                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-700">Digital products only</span>
                </label>
              </div>

              {/* In Stock Filter */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showInStockOnly}
                    onChange={(e) => setShowInStockOnly(e.target.checked)}
                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-700">In stock only</span>
                </label>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Showing {filteredProducts.length} of {products.length} products
        </span>
        {searchTerm && (
          <span>
            Results for "{searchTerm}"
          </span>
        )}
      </div>

      {/* Products Grid/List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isMember={isMember}
              viewMode={viewMode}
              onAddToCart={() => handleAddToCart(product)}
              onSelect={() => onProductSelect?.(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  isMember: boolean;
  viewMode: 'grid' | 'list';
  onAddToCart: () => void;
  onSelect: () => void;
}

function ProductCard({ product, isMember, viewMode, onAddToCart, onSelect }: ProductCardProps) {
  const stockStatus = getStockStatus(product);
  const isAvailable = stockStatus.status !== 'out-of-stock';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStockStatus = (product: Product) => {
    if (product.isDigital || product.printifyProductId) {
      return { status: 'available', text: 'Digital/Print-on-Demand' };
    }
    
    if (product.inventory > 10) {
      return { status: 'in-stock', text: 'In Stock' };
    } else if (product.inventory > 0) {
      return { status: 'low-stock', text: `${product.inventory} left` };
    } else {
      return { status: 'out-of-stock', text: 'Out of Stock' };
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
        <div className="flex items-center space-x-4">
          {/* Product Image */}
          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {product.category} • SKU: {product.sku}
                </p>
                {product.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {product.description.replace(/<[^>]*>/g, '')}
                  </p>
                )}
              </div>

              <div className="text-right ml-4">
                {/* Pricing */}
                <div className="space-y-1">
                  <div className="text-lg font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </div>
                  {isMember && product.memberPrice && product.memberPrice < product.publicPrice && (
                    <div className="text-sm text-gray-500 line-through">
                      {formatPrice(product.publicPrice)}
                    </div>
                  )}
                </div>

                {/* Stock Status */}
                <div className={`text-xs mt-1 ${
                  stockStatus.status === 'in-stock' ? 'text-green-600' :
                  stockStatus.status === 'low-stock' ? 'text-yellow-600' :
                  stockStatus.status === 'available' ? 'text-blue-600' :
                  'text-red-600'
                }`}>
                  {stockStatus.text}
                </div>
              </div>
            </div>

            {/* Tags and Actions */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                {product.isDigital && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Digital
                  </span>
                )}
                {product.specifications?.printify && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Print-on-Demand
                  </span>
                )}
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                disabled={!isAvailable}
                size="sm"
                className="flex items-center gap-1"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4">
        {/* Category and Tags */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            {product.category}
          </span>
          <div className="flex space-x-1">
            {product.isDigital && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Digital
              </span>
            )}
            {product.specifications?.printify && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                POD
              </span>
            )}
          </div>
        </div>

        {/* Product Name */}
        <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description.replace(/<[^>]*>/g, '')}
          </p>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xl font-bold text-gray-900">
              {formatPrice(product.price)}
            </div>
            {isMember && product.memberPrice && product.memberPrice < product.publicPrice && (
              <div className="text-sm text-gray-500 line-through">
                {formatPrice(product.publicPrice)}
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className={`text-xs ${
            stockStatus.status === 'in-stock' ? 'text-green-600' :
            stockStatus.status === 'low-stock' ? 'text-yellow-600' :
            stockStatus.status === 'available' ? 'text-blue-600' :
            'text-red-600'
          }`}>
            {stockStatus.text}
          </div>
        </div>

        {/* SKU */}
        <div className="text-xs text-gray-500 mb-3">
          SKU: {product.sku}
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
          disabled={!isAvailable}
          className="w-full flex items-center justify-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}

export default ProductCatalog;
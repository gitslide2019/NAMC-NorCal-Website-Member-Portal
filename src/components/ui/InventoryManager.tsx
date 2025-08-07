/**
 * Inventory Manager Component
 * Admin interface for managing product inventory with Shopify sync
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save, 
  X,
  Sync,
  ExternalLink,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  publicPrice: number;
  memberPrice?: number;
  inventory: number;
  isActive: boolean;
  isDigital: boolean;
  shopifyProductId?: string;
  printifyProductId?: string;
  shopifyLastSync?: string;
  printifyLastSync?: string;
  shopifySyncStatus: string;
  printifySyncStatus: string;
  specifications?: any;
}

interface InventoryUpdate {
  productId: string;
  newInventory: number;
}

interface SyncResult {
  success: boolean;
  productsProcessed: number;
  errors: string[];
}

export function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [inventoryUpdates, setInventoryUpdates] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [syncResults, setSyncResults] = useState<{
    shopify?: SyncResult;
    printify?: SyncResult;
  } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shop?admin=true');
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
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

  const syncProducts = async () => {
    try {
      setSyncing(true);
      setSyncResults(null);
      
      const response = await fetch('/api/shop/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all_products' }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncResults(data.data);
        await fetchProducts(); // Refresh the product list
      } else {
        setError(data.error || 'Failed to sync products');
      }
    } catch (err) {
      setError('Failed to sync products');
      console.error('Error syncing products:', err);
    } finally {
      setSyncing(false);
    }
  };

  const syncInventory = async () => {
    try {
      setSyncing(true);
      
      const response = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_shopify_inventory' }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchProducts(); // Refresh the product list
      } else {
        setError(data.error || 'Failed to sync inventory');
      }
    } catch (err) {
      setError('Failed to sync inventory');
      console.error('Error syncing inventory:', err);
    } finally {
      setSyncing(false);
    }
  };

  const updateInventory = async (productId: string, newInventory: number) => {
    try {
      const response = await fetch(`/api/shop/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, inventory: newInventory }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, inventory: newInventory } : p
        ));
        
        // Clear editing state
        setEditingProduct(null);
        delete inventoryUpdates[productId];
        setInventoryUpdates({ ...inventoryUpdates });
      } else {
        setError(data.error || 'Failed to update inventory');
      }
    } catch (err) {
      setError('Failed to update inventory');
      console.error('Error updating inventory:', err);
    }
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/shop/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();

      if (data.success) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, isActive } : p
        ));
      } else {
        setError(data.error || 'Failed to update product status');
      }
    } catch (err) {
      setError('Failed to update product status');
      console.error('Error updating product status:', err);
    }
  };

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    const matchesLowStock = !showLowStock || 
      (!product.isDigital && !product.printifyProductId && product.inventory <= 5);

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const categories = [...new Set(products.map(p => p.category))].sort();

  const getStockStatus = (product: Product) => {
    if (product.isDigital || product.printifyProductId) {
      return { status: 'unlimited', color: 'text-blue-600', icon: CheckCircle };
    }
    
    if (product.inventory > 10) {
      return { status: 'good', color: 'text-green-600', icon: CheckCircle };
    } else if (product.inventory > 0) {
      return { status: 'low', color: 'text-yellow-600', icon: AlertTriangle };
    } else {
      return { status: 'out', color: 'text-red-600', icon: XCircle };
    }
  };

  const getSyncStatus = (status: string, lastSync?: string) => {
    const syncDate = lastSync ? new Date(lastSync) : null;
    const isRecent = syncDate && (Date.now() - syncDate.getTime()) < 24 * 60 * 60 * 1000; // 24 hours

    switch (status) {
      case 'SYNCED':
        return { 
          color: isRecent ? 'text-green-600' : 'text-yellow-600', 
          text: isRecent ? 'Synced' : 'Needs Sync',
          icon: isRecent ? CheckCircle : AlertTriangle
        };
      case 'ERROR':
        return { color: 'text-red-600', text: 'Error', icon: XCircle };
      case 'PENDING':
        return { color: 'text-gray-600', text: 'Pending', icon: RefreshCw };
      default:
        return { color: 'text-gray-400', text: 'Unknown', icon: XCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-2 text-gray-600">Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-600">Manage product inventory and sync with Shopify</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={syncInventory}
            disabled={syncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Sync className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Inventory
          </Button>
          <Button
            onClick={syncProducts}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync All Products
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="sm"
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Sync Results */}
      {syncResults && (
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Sync Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {syncResults.shopify && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Shopify Sync</h4>
                <div className={`text-sm ${syncResults.shopify.success ? 'text-green-600' : 'text-red-600'}`}>
                  {syncResults.shopify.success ? 'Success' : 'Failed'}
                </div>
                <div className="text-sm text-gray-600">
                  Products processed: {syncResults.shopify.productsProcessed}
                </div>
                {syncResults.shopify.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    Errors: {syncResults.shopify.errors.length}
                  </div>
                )}
              </div>
            )}
            
            {syncResults.printify && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Printify Sync</h4>
                <div className={`text-sm ${syncResults.printify.success ? 'text-green-600' : 'text-red-600'}`}>
                  {syncResults.printify.success ? 'Success' : 'Failed'}
                </div>
                <div className="text-sm text-gray-600">
                  Products processed: {syncResults.printify.productsProcessed}
                </div>
                {syncResults.printify.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    Errors: {syncResults.printify.errors.length}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        
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

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
          />
          <span className="text-sm text-gray-700">Low stock only</span>
        </label>
      </div>

      {/* Inventory Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sync Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => {
                const stockStatus = getStockStatus(product);
                const shopifySync = getSyncStatus(product.shopifySyncStatus, product.shopifyLastSync);
                const printifySync = getSyncStatus(product.printifySyncStatus, product.printifyLastSync);
                const isEditing = editingProduct === product.id;
                const StockIcon = stockStatus.icon;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.sku}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={inventoryUpdates[product.id] ?? product.inventory}
                            onChange={(e) => setInventoryUpdates(prev => ({
                              ...prev,
                              [product.id]: parseInt(e.target.value) || 0
                            }))}
                            className="w-20"
                            min="0"
                          />
                          <Button
                            onClick={() => updateInventory(product.id, inventoryUpdates[product.id] ?? product.inventory)}
                            size="sm"
                            className="p-1"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingProduct(null);
                              delete inventoryUpdates[product.id];
                              setInventoryUpdates({ ...inventoryUpdates });
                            }}
                            variant="ghost"
                            size="sm"
                            className="p-1"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">
                            {product.isDigital || product.printifyProductId ? '∞' : product.inventory}
                          </span>
                          {!product.isDigital && !product.printifyProductId && (
                            <Button
                              onClick={() => setEditingProduct(product.id)}
                              variant="ghost"
                              size="sm"
                              className="p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <StockIcon className={`h-4 w-4 ${stockStatus.color}`} />
                        <span className={`text-sm ${stockStatus.color}`}>
                          {stockStatus.status === 'unlimited' ? 'Unlimited' :
                           stockStatus.status === 'good' ? 'In Stock' :
                           stockStatus.status === 'low' ? 'Low Stock' :
                           'Out of Stock'}
                        </span>
                      </div>
                      
                      <div className="mt-1">
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={product.isActive}
                            onChange={(e) => toggleProductStatus(product.id, e.target.checked)}
                            className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                          />
                          <span className="text-xs text-gray-600">Active</span>
                        </label>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {product.shopifyProductId && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">Shopify:</span>
                            <span className={`text-xs ${shopifySync.color}`}>
                              {shopifySync.text}
                            </span>
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                        
                        {product.printifyProductId && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">Printify:</span>
                            <span className={`text-xs ${printifySync.color}`}>
                              {printifySync.text}
                            </span>
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            // Navigate to product details or edit page
                            console.log('Edit product:', product.id);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Stock</p>
              <p className="text-2xl font-semibold text-gray-900">
                {products.filter(p => p.isDigital || p.printifyProductId || p.inventory > 0).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Low Stock</p>
              <p className="text-2xl font-semibold text-gray-900">
                {products.filter(p => !p.isDigital && !p.printifyProductId && p.inventory > 0 && p.inventory <= 5).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Out of Stock</p>
              <p className="text-2xl font-semibold text-gray-900">
                {products.filter(p => !p.isDigital && !p.printifyProductId && p.inventory === 0).length}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default InventoryManager;
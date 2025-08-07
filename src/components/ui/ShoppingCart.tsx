'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  memberPrice?: number;
  quantity: number;
  image?: string;
  variant?: string;
  isDigital: boolean;
}

interface ShoppingCartProps {
  onCheckout: (items: CartItem[]) => void;
  onClose?: () => void;
}

export function ShoppingCart({ onCheckout, onClose }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isMember } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('namc-shopping-cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('namc-shopping-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCartItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getItemPrice = (item: CartItem) => {
    return isMember && item.memberPrice ? item.memberPrice : item.price;
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (getItemPrice(item) * item.quantity);
    }, 0);
  };

  const getTax = () => {
    // California sales tax (approximate)
    return getSubtotal() * 0.0875;
  };

  const getTotal = () => {
    return getSubtotal() + getTax();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    setIsLoading(true);
    try {
      await onCheckout(cartItems);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <Card className="p-6 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-500 mb-4">Add some items to get started</p>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            Continue Shopping
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cart Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
        <Button
          onClick={clearCart}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
        >
          Clear Cart
        </Button>
      </div>

      {/* Member Discount Notice */}
      {isMember && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Member Discount Applied!</strong> You're saving on member-exclusive pricing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-4">
        {cartItems.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center space-x-4">
              {/* Product Image */}
              {item.image && (
                <div className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-medium text-gray-900 truncate">
                  {item.name}
                </h4>
                {item.variant && (
                  <p className="text-sm text-gray-500">{item.variant}</p>
                )}
                {item.isDigital && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Digital Product
                  </span>
                )}
                
                {/* Pricing */}
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-lg font-semibold text-gray-900">
                    ${getItemPrice(item).toFixed(2)}
                  </span>
                  {isMember && item.memberPrice && item.memberPrice < item.price && (
                    <span className="text-sm text-gray-500 line-through">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium w-8 text-center">
                  {item.quantity}
                </span>
                <Button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Item Total */}
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  ${(getItemPrice(item) * item.quantity).toFixed(2)}
                </p>
              </div>

              {/* Remove Button */}
              <Button
                onClick={() => removeItem(item.id)}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Order Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">${getSubtotal().toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="text-gray-900">${getTax().toFixed(2)}</span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">${getTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          onClick={handleCheckout}
          disabled={isLoading || cartItems.length === 0}
          className="w-full mt-6"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Proceed to Checkout</span>
            </div>
          )}
        </Button>
      </Card>

      {/* Continue Shopping */}
      {onClose && (
        <div className="text-center">
          <Button onClick={onClose} variant="outline">
            Continue Shopping
          </Button>
        </div>
      )}
    </div>
  );
}

// Hook for managing cart state globally
export function useShoppingCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('namc-shopping-cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  const addToCart = (product: Omit<CartItem, 'id' | 'quantity'>) => {
    const existingItem = cartItems.find(item => 
      item.productId === product.productId && item.variant === product.variant
    );

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        ...product,
        id: `${product.productId}-${Date.now()}`,
        quantity: 1
      };
      
      const updatedCart = [...cartItems, newItem];
      setCartItems(updatedCart);
      localStorage.setItem('namc-shopping-cart', JSON.stringify(updatedCart));
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    const updatedCart = cartItems.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(0, newQuantity) } : item
    ).filter(item => item.quantity > 0);
    
    setCartItems(updatedCart);
    localStorage.setItem('namc-shopping-cart', JSON.stringify(updatedCart));
  };

  const removeFromCart = (itemId: string) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId);
    setCartItems(updatedCart);
    localStorage.setItem('namc-shopping-cart', JSON.stringify(updatedCart));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('namc-shopping-cart');
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartCount
  };
}
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart } from '@/components/ui/ShoppingCart';
import { CheckoutProcess } from '@/components/ui/CheckoutProcess';
import { useShoppingCart } from '@/components/ui/ShoppingCart';

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

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [currentStep, setCurrentStep] = useState<'cart' | 'checkout'>('cart');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { cartItems: hookCartItems } = useShoppingCart();

  useEffect(() => {
    // If there's an existing order ID, go straight to checkout
    if (orderId) {
      setCurrentStep('checkout');
      // Load cart items from the order
      loadOrderItems(orderId);
    } else {
      // Load cart items from localStorage/hook
      setCartItems(hookCartItems);
      if (hookCartItems.length === 0) {
        // Redirect to shop if cart is empty
        router.push('/member/shop');
      }
    }
  }, [orderId, hookCartItems, router]);

  const loadOrderItems = async (orderIdParam: string) => {
    try {
      const response = await fetch(`/api/shop/orders/${orderIdParam}`);
      if (response.ok) {
        const order = await response.json();
        // Convert order items back to cart format
        const orderCartItems: CartItem[] = order.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          memberPrice: item.memberPrice,
          quantity: item.quantity,
          image: item.image,
          variant: item.variant,
          isDigital: item.isDigital
        }));
        setCartItems(orderCartItems);
      }
    } catch (error) {
      console.error('Error loading order items:', error);
      router.push('/member/shop');
    }
  };

  const handleProceedToCheckout = async (items: CartItem[]) => {
    try {
      // Create a draft order
      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            variant: item.variant,
            price: item.memberPrice || item.price
          })),
          status: 'draft'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();
      
      // Update URL with order ID and proceed to checkout
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('order_id', order.id);
      window.history.pushState({}, '', newUrl.toString());
      
      setCurrentStep('checkout');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('There was an error processing your request. Please try again.');
    }
  };

  const handleCheckoutSuccess = (orderIdParam: string) => {
    // Redirect to success page
    router.push(`/member/shop/success?order_id=${orderIdParam}`);
  };

  const handleBackToCart = () => {
    // Remove order_id from URL and go back to cart
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('order_id');
    window.history.pushState({}, '', newUrl.toString());
    
    setCurrentStep('cart');
  };

  const handleBackToShop = () => {
    router.push('/member/shop');
  };

  if (cartItems.length === 0 && currentStep === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <ShoppingCart 
            onCheckout={handleProceedToCheckout}
            onClose={handleBackToShop}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentStep === 'cart' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
              <p className="text-gray-600 mt-2">Review your items before checkout</p>
            </div>
            
            <ShoppingCart 
              onCheckout={handleProceedToCheckout}
              onClose={handleBackToShop}
            />
          </>
        )}

        {currentStep === 'checkout' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
              <p className="text-gray-600 mt-2">Complete your purchase</p>
            </div>
            
            <CheckoutProcess
              cartItems={cartItems}
              onSuccess={handleCheckoutSuccess}
              onCancel={handleBackToCart}
            />
          </>
        )}
      </div>
    </div>
  );
}
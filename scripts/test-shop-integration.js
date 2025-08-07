#!/usr/bin/env node

/**
 * Test Shop Integration Script
 * Tests Shopify and Printify API connections and basic functionality
 */

const { PrismaClient } = require('@prisma/client');

async function testShopifyConnection() {
  console.log('🛍️  Testing Shopify connection...');
  
  try {
    const ShopifyService = (await import('../src/lib/services/shopify-api.service.js')).default;
    const shopifyService = new ShopifyService();
    
    // Test basic connection by fetching a few products
    const products = await shopifyService.getProducts(5);
    console.log(`   ✅ Successfully connected to Shopify`);
    console.log(`   📦 Found ${products.length} products`);
    
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log(`   📋 Sample product: ${firstProduct.title}`);
      console.log(`   💰 Price: $${firstProduct.variants[0]?.price || 'N/A'}`);
    }
    
    // Test inventory levels
    const inventory = await shopifyService.getInventoryLevels();
    console.log(`   📊 Found ${inventory.length} inventory items`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Shopify connection failed: ${error.message}`);
    return false;
  }
}

async function testPrintifyConnection() {
  console.log('\n🎨 Testing Printify connection...');
  
  try {
    const PrintifyService = (await import('../src/lib/services/printify-api.service.js')).default;
    const printifyService = new PrintifyService();
    
    // Test basic connection by fetching products
    const response = await printifyService.getProducts(5, 1);
    console.log(`   ✅ Successfully connected to Printify`);
    console.log(`   📦 Found ${response.data.length} products (Page 1 of ${response.last_page})`);
    console.log(`   📊 Total products: ${response.total}`);
    
    if (response.data.length > 0) {
      const firstProduct = response.data[0];
      console.log(`   📋 Sample product: ${firstProduct.title}`);
      const enabledVariant = firstProduct.variants.find(v => v.is_enabled);
      if (enabledVariant) {
        console.log(`   💰 Price: $${enabledVariant.price}`);
      }
    }
    
    // Test blueprints
    const blueprints = await printifyService.getBlueprints();
    console.log(`   🎯 Available blueprints: ${blueprints.length}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Printify connection failed: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n💾 Testing database connection...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test basic database operations
    const productCount = await prisma.product.count();
    console.log(`   ✅ Successfully connected to database`);
    console.log(`   📦 Current products in database: ${productCount}`);
    
    // Test product creation/update
    const testProduct = await prisma.product.upsert({
      where: { sku: 'test-integration-product' },
      update: {
        name: 'Test Integration Product',
        updatedAt: new Date(),
      },
      create: {
        name: 'Test Integration Product',
        description: 'Test product for integration testing',
        category: 'Test',
        sku: 'test-integration-product',
        publicPrice: 19.99,
        memberPrice: 17.99,
        inventory: 100,
      },
    });
    
    console.log(`   📋 Test product created/updated: ${testProduct.name}`);
    
    // Clean up test product
    await prisma.product.delete({
      where: { id: testProduct.id },
    });
    
    console.log(`   🧹 Test product cleaned up`);
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
    return false;
  }
}

async function testShopService() {
  console.log('\n🏪 Testing Shop Service integration...');
  
  try {
    const ShopService = (await import('../src/lib/services/shop.service.js')).default;
    const shopService = new ShopService();
    
    // Test getting products
    const products = await shopService.getProducts(false, undefined, 5);
    console.log(`   ✅ Successfully fetched ${products.length} products from Shop Service`);
    
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log(`   📋 Sample product: ${firstProduct.name}`);
      console.log(`   💰 Public price: $${firstProduct.price}`);
    }
    
    // Test member pricing
    const memberProducts = await shopService.getProducts(true, undefined, 5);
    console.log(`   👥 Member pricing test: ${memberProducts.length} products`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Shop Service test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Starting Shop Integration Tests...');
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  const results = {
    database: false,
    shopify: false,
    printify: false,
    shopService: false,
  };
  
  // Test database connection first
  results.database = await testDatabaseConnection();
  
  // Test external API connections
  results.shopify = await testShopifyConnection();
  results.printify = await testPrintifyConnection();
  
  // Test integrated shop service
  if (results.database) {
    results.shopService = await testShopService();
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   💾 Database: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   🛍️  Shopify: ${results.shopify ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   🎨 Printify: ${results.printify ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   🏪 Shop Service: ${results.shopService ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All integration tests passed! Shop system is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration and try again.');
    
    // Provide troubleshooting tips
    console.log('\n🔧 Troubleshooting Tips:');
    if (!results.database) {
      console.log('   💾 Database: Check DATABASE_URL in .env file');
    }
    if (!results.shopify) {
      console.log('   🛍️  Shopify: Check SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE_URL, and SHOPIFY_LOCATION_ID in .env file');
    }
    if (!results.printify) {
      console.log('   🎨 Printify: Check PRINTIFY_API_KEY and PRINTIFY_SHOP_ID in .env file');
    }
  }
  
  process.exit(passCount === totalTests ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Shop Integration Test Script

Usage: node scripts/test-shop-integration.js [options]

Options:
  --help, -h           Show this help message

This script tests:
  - Database connectivity and operations
  - Shopify API connection and basic operations
  - Printify API connection and basic operations
  - Shop Service integration functionality

Environment variables required:
  - DATABASE_URL
  - SHOPIFY_ACCESS_TOKEN
  - SHOPIFY_STORE_URL
  - SHOPIFY_LOCATION_ID
  - PRINTIFY_API_KEY
  - PRINTIFY_SHOP_ID
  `);
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
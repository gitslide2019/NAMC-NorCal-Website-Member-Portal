#!/usr/bin/env node

/**
 * Shop Product Sync Script
 * Automated synchronization of products from Shopify and Printify
 * Can be run as a cron job for regular updates
 */

const { PrismaClient } = require('@prisma/client');

// Import services - need to handle ES modules in CommonJS
async function importServices() {
  const ShopService = (await import('../src/lib/services/shop.service.js')).default;
  return { ShopService };
}

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting shop product synchronization...');
    console.log(`📅 ${new Date().toISOString()}`);
    
    const { ShopService } = await importServices();
    const shopService = new ShopService();

    // Sync all products
    console.log('\n📦 Syncing products from Shopify and Printify...');
    const syncResults = await shopService.syncAllProducts();

    // Log Shopify results
    console.log('\n🛍️  Shopify Sync Results:');
    console.log(`   ✅ Success: ${syncResults.shopify.success}`);
    console.log(`   📊 Products processed: ${syncResults.shopify.productsProcessed}`);
    if (syncResults.shopify.errors.length > 0) {
      console.log(`   ❌ Errors: ${syncResults.shopify.errors.length}`);
      syncResults.shopify.errors.forEach(error => {
        console.log(`      - ${error}`);
      });
    }

    // Log Printify results
    console.log('\n🎨 Printify Sync Results:');
    console.log(`   ✅ Success: ${syncResults.printify.success}`);
    console.log(`   📊 Products processed: ${syncResults.printify.productsProcessed}`);
    if (syncResults.printify.errors.length > 0) {
      console.log(`   ❌ Errors: ${syncResults.printify.errors.length}`);
      syncResults.printify.errors.forEach(error => {
        console.log(`      - ${error}`);
      });
    }

    // Sync Shopify inventory
    console.log('\n📋 Syncing Shopify inventory levels...');
    const inventoryResult = await shopService.syncShopifyInventory();
    console.log(`   ✅ Success: ${inventoryResult.success}`);
    console.log(`   📊 Products updated: ${inventoryResult.productsProcessed}`);
    if (inventoryResult.errors.length > 0) {
      console.log(`   ❌ Errors: ${inventoryResult.errors.length}`);
      inventoryResult.errors.forEach(error => {
        console.log(`      - ${error}`);
      });
    }

    // Get final statistics
    const totalProducts = await prisma.product.count();
    const activeProducts = await prisma.product.count({
      where: { isActive: true }
    });
    const shopifyProducts = await prisma.product.count({
      where: { shopifyProductId: { not: null } }
    });
    const printifyProducts = await prisma.product.count({
      where: { printifyProductId: { not: null } }
    });

    console.log('\n📈 Final Statistics:');
    console.log(`   📦 Total products: ${totalProducts}`);
    console.log(`   ✅ Active products: ${activeProducts}`);
    console.log(`   🛍️  Shopify products: ${shopifyProducts}`);
    console.log(`   🎨 Printify products: ${printifyProducts}`);

    // Log sync status summary
    const syncStatusCounts = await prisma.product.groupBy({
      by: ['shopifySyncStatus'],
      _count: { id: true },
    });

    console.log('\n🔄 Sync Status Summary:');
    syncStatusCounts.forEach(status => {
      console.log(`   ${status.shopifySyncStatus}: ${status._count.id} products`);
    });

    console.log('\n✅ Shop product synchronization completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during shop product synchronization:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  shopifyOnly: args.includes('--shopify-only'),
  printifyOnly: args.includes('--printify-only'),
  inventoryOnly: args.includes('--inventory-only'),
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Shop Product Sync Script

Usage: node scripts/sync-shop-products.js [options]

Options:
  --verbose, -v        Enable verbose logging
  --shopify-only       Sync only Shopify products
  --printify-only      Sync only Printify products
  --inventory-only     Sync only inventory levels
  --help, -h           Show this help message

Examples:
  node scripts/sync-shop-products.js
  node scripts/sync-shop-products.js --verbose
  node scripts/sync-shop-products.js --shopify-only
  node scripts/sync-shop-products.js --inventory-only

Cron job example (daily at 2 AM):
  0 2 * * * cd /path/to/project && node scripts/sync-shop-products.js >> logs/shop-sync.log 2>&1
  `);
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// California coordinates for common locations
const LOCATION_COORDINATES = {
  // Major Bay Area cities
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Oakland': { lat: 37.8044, lng: -122.2711 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'Berkeley': { lat: 37.8715, lng: -122.2730 },
  'Fremont': { lat: 37.5485, lng: -121.9886 },
  'Hayward': { lat: 37.6688, lng: -122.0808 },
  'Sunnyvale': { lat: 37.3688, lng: -122.0363 },
  'Santa Clara': { lat: 37.3541, lng: -121.9552 },
  'Redwood City': { lat: 37.4852, lng: -122.2364 },
  'Mountain View': { lat: 37.3861, lng: -122.0839 },
  'Palo Alto': { lat: 37.4419, lng: -122.1430 },
  'Concord': { lat: 37.9780, lng: -122.0311 },
  'Richmond': { lat: 37.9358, lng: -122.3477 },
  'Walnut Creek': { lat: 37.9101, lng: -122.0652 },
  'San Mateo': { lat: 37.5630, lng: -122.3255 },
  'Daly City': { lat: 37.7058, lng: -122.4622 },
  
  // Sacramento Area
  'Sacramento': { lat: 38.5816, lng: -121.4944 },
  'Roseville': { lat: 38.7521, lng: -121.2880 },
  'Elk Grove': { lat: 38.4088, lng: -121.3716 },
  'Folsom': { lat: 38.6779, lng: -121.1760 },
  
  // Central Valley
  'Fresno': { lat: 36.7378, lng: -119.7871 },
  'Modesto': { lat: 37.6391, lng: -120.9969 },
  'Stockton': { lat: 37.9577, lng: -121.2908 },
  'Bakersfield': { lat: 35.3733, lng: -119.0187 },
  
  // Los Angeles Area
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Long Beach': { lat: 33.7701, lng: -118.1937 },
  'Anaheim': { lat: 33.8366, lng: -117.9143 },
  'Santa Ana': { lat: 33.7455, lng: -117.8677 },
  'Riverside': { lat: 33.9533, lng: -117.3962 },
  'San Bernardino': { lat: 34.1083, lng: -117.2898 },
  'Oxnard': { lat: 34.1975, lng: -119.1771 },
  'Thousand Oaks': { lat: 34.1706, lng: -118.8376 },
  'Simi Valley': { lat: 34.2694, lng: -118.7815 },
  'Ventura': { lat: 34.2746, lng: -119.2290 },
  
  // San Diego Area
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Chula Vista': { lat: 32.6401, lng: -117.0842 },
  'Oceanside': { lat: 33.1959, lng: -117.3795 },
  'Escondido': { lat: 33.1192, lng: -117.0864 },
  
  // Default Northern California center for unknown locations
  'Northern California': { lat: 37.7749, lng: -122.4194 },
  'California': { lat: 37.7749, lng: -122.4194 }
};

// Function to find coordinates for a location string
function getCoordinatesForLocation(locationStr) {
  if (!locationStr) return LOCATION_COORDINATES['Northern California'];
  
  // Clean up the location string
  const location = locationStr.trim();
  
  // Direct match
  if (LOCATION_COORDINATES[location]) {
    return LOCATION_COORDINATES[location];
  }
  
  // Try to find a match within the string
  for (const [city, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (location.toLowerCase().includes(city.toLowerCase())) {
      return coords;
    }
  }
  
  // Default to Northern California
  return LOCATION_COORDINATES['Northern California'];
}

async function addCoordinatesToOpportunities() {
  try {
    console.log('🗺️  Adding coordinates to opportunities...');
    
    // Get all opportunities without coordinates
    const opportunities = await prisma.opportunity.findMany({
      where: {
        OR: [
          { latitude: null },
          { longitude: null }
        ]
      }
    });
    
    console.log(`📍 Found ${opportunities.length} opportunities needing coordinates`);
    
    let updated = 0;
    for (const opp of opportunities) {
      const coords = getCoordinatesForLocation(opp.location);
      
      await prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          latitude: coords.lat,
          longitude: coords.lng
        }
      });
      
      console.log(`✅ Updated "${opp.title}" in ${opp.location || 'Unknown'} → (${coords.lat}, ${coords.lng})`);
      updated++;
    }
    
    console.log(`🎯 Successfully added coordinates to ${updated} opportunities!`);
    
    // Verify the update
    const totalWithCoords = await prisma.opportunity.count({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      }
    });
    
    console.log(`📊 Total opportunities with coordinates: ${totalWithCoords}`);
    
  } catch (error) {
    console.error('❌ Error adding coordinates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addCoordinatesToOpportunities();
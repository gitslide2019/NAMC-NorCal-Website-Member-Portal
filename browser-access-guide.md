# 🚀 NAMC Permit Search - Browser Access Guide

## Quick Access Guide

### 1. **Start the Server**
```bash
npm run dev
```
Server should be running on: http://localhost:3000

### 2. **Sign In**
Navigate to: http://localhost:3000/auth/signin

**Demo Member Credentials:**
- Email: `member@namc-norcal.org`
- Password: `member123`

**Demo Admin Credentials:**
- Email: `admin@namc-norcal.org`  
- Password: `admin123`

### 3. **Access Permit Search**
After successful login, navigate to:
http://localhost:3000/member/permits

## ✨ **NAMC Design Features**

The permit search now uses the official NAMC design system:

### **NAMC Color Scheme:**
- 🟡 **NAMC Yellow** (`#FFD700`) - Primary accent color for buttons and highlights
- 🟠 **Accent Yellow** (`#FFA500`) - Secondary accent for hover states
- ⚫ **NAMC Black** (`#1A1A1A`) - Primary text and contrasts
- 🟨 **Light Yellow** (`#FFF8DC`) - Background highlights and panels
- **Inter Font** - Professional typography throughout

### **Visual Elements:**
- Clean white cards with subtle shadows
- Yellow accent borders on hover
- Rounded full icon containers with NAMC colors
- Consistent spacing and typography
- Professional button styling with NAMC branding

## ✨ **What You'll See**

### **Permit Dashboard Features:**
- 📊 **Statistics Cards**: Total permits, issued permits, pending review, total value
- 🔍 **Search Bar**: Search by permit number, description, address, or contractor  
- 🔧 **Filter Controls**: Status, permit type, and time period filters
- 📋 **Permit Cards**: Interactive cards with permit details
- 👁️ **Details Modal**: Click "Details" button for comprehensive permit information
- 📱 **Responsive Design**: Works on all screen sizes

### **Search Functionality:**
1. **Type in search bar** → Results filter in real-time (300ms debounce)
2. **Click Filters button** → Expand filter panel
3. **Select status/type/date** → Apply multiple filters
4. **Click "Details"** → View comprehensive permit information
5. **Click "Refresh"** → Reload permit data

### **API Configuration:**
- The page will show "Shovels API Not Configured" message if API key is missing
- To configure: Go to Settings → Permits and add your Shovels API key
- Or add `NEXT_PUBLIC_SHOVELS_API_KEY` to your `.env.local` file

## 🧪 **Testing the Search**

### **Manual Test Steps:**
1. ✅ Type "building" in search bar
2. ✅ Click clear (X) button to clear search
3. ✅ Click "Filters" to expand filter panel
4. ✅ Select different status filters
5. ✅ Click "Clear Filters" to reset
6. ✅ Click "Details" on any permit card
7. ✅ Close modal with X button
8. ✅ Try on mobile by resizing browser

### **Expected Behavior:**
- Search updates results immediately
- Filters work independently and together
- No results state shows helpful message
- All interactions are smooth and responsive
- Statistics update based on filtered results

## 🔧 **Troubleshooting**

**If you see the public landing page:**
- You're not signed in → Go to /auth/signin first

**If permits page is blank:**
- Check browser console for errors
- Verify Shovels API configuration
- Try refreshing the page

**If search doesn't work:**
- API may not be configured (expected behavior)
- Check network tab for API calls
- Verify test IDs are present in DOM

## 📋 **Component Test IDs**
All elements have test IDs for automated testing:
- `permit-search-input`
- `clear-search-button`
- `toggle-filters-button`
- `status-filter-select`
- `clear-filters-button`
- `refresh-permits-button`
- `permit-card-{id}`
- `permit-details-button-{id}`
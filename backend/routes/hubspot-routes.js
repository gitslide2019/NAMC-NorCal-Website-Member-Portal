const express = require('express')
const {
  syncOpportunities,
  syncMembers,
  getOpportunitiesFromHubSpot,
  getMembersFromHubSpot,
  getHubSpotStatus
} = require('../controllers/hubspot-controller')
const { protect, admin } = require('../middleware/auth-middleware')

const router = express.Router()

// Admin-only sync endpoints
router.post('/sync-opportunities', protect, admin, syncOpportunities)
router.post('/sync-members', protect, admin, syncMembers)
router.get('/status', protect, admin, getHubSpotStatus)

// Protected data endpoints
router.get('/opportunities', protect, getOpportunitiesFromHubSpot)
router.get('/members', protect, getMembersFromHubSpot)

module.exports = router
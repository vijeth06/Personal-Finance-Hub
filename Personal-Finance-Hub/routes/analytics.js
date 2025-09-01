const express = require('express');
const Analytics = require('../models/Analytics');
const AnalyticsService = require('../services/analyticsService');
const { auth } = require('../middleware/auth');

const router = express.Router();


router.get('/', auth, async (req, res) => {
  try {
    const { periodType = 'monthly', refresh = false } = req.query;
    
    let analytics;
    
    if (refresh === 'true') {
      
      analytics = await AnalyticsService.computeAnalytics(req.user._id, periodType);
    } else {
      
      const currentPeriod = AnalyticsService.getCurrentPeriod(periodType);
      analytics = await Analytics.findOne({
        userId: req.user._id,
        period: currentPeriod,
        periodType
      });
      
      
      if (!analytics || isDataStale(analytics.computedAt)) {
        analytics = await AnalyticsService.computeAnalytics(req.user._id, periodType);
      }
    }
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/insights', auth, async (req, res) => {
  try {
    const { periodType = 'monthly' } = req.query;
    const currentPeriod = AnalyticsService.getCurrentPeriod(periodType);
    
    const analytics = await Analytics.findOne({
      userId: req.user._id,
      period: currentPeriod,
      periodType
    });
    
    if (!analytics) {
      return res.status(404).json({ error: 'No analytics data found. Please refresh analytics first.' });
    }
    
    const insights = {
      spendingPatterns: analytics.spendingPatterns,
      topCategories: analytics.spendingPatterns.categoryBreakdown
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
      peakSpendingDays: analytics.spendingPatterns.peakSpendingDays,
      spendingVelocity: analytics.spendingPatterns.spendingVelocity,
      financialHealthScore: analytics.metrics.financialHealthScore
    };
    
    res.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/anomalies', auth, async (req, res) => {
  try {
    const { severity, limit = 10 } = req.query;
    
    const query = { userId: req.user._id };
    if (severity) {
      query['anomalies.severity'] = severity;
    }
    
    const analytics = await Analytics.find(query)
      .sort({ computedAt: -1 })
      .limit(parseInt(limit));
    
    
    const allAnomalies = analytics.reduce((acc, analytic) => {
      return acc.concat(analytic.anomalies.map(anomaly => ({
        ...anomaly.toObject(),
        period: analytic.period,
        periodType: analytic.periodType
      })));
    }, []);
    
    
    allAnomalies.sort((a, b) => {
      if (a.severity !== b.severity) {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(b.date) - new Date(a.date);
    });
    
    res.json(allAnomalies.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/predictions', auth, async (req, res) => {
  try {
    const { periodType = 'monthly' } = req.query;
    const currentPeriod = AnalyticsService.getCurrentPeriod(periodType);
    
    const analytics = await Analytics.findOne({
      userId: req.user._id,
      period: currentPeriod,
      periodType
    });
    
    if (!analytics) {
      return res.status(404).json({ error: 'No analytics data found. Please refresh analytics first.' });
    }
    
    res.json(analytics.predictions);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/seasonal', auth, async (req, res) => {
  try {
    const { periodType = 'monthly' } = req.query;
    
    
    const analytics = await Analytics.findOne({
      userId: req.user._id,
      periodType
    }).sort({ computedAt: -1 });
    
    if (!analytics) {
      return res.status(404).json({ error: 'No analytics data found. Please refresh analytics first.' });
    }
    
    res.json(analytics.seasonalTrends);
  } catch (error) {
    console.error('Error fetching seasonal trends:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/metrics', auth, async (req, res) => {
  try {
    const { periodType = 'monthly' } = req.query;
    const currentPeriod = AnalyticsService.getCurrentPeriod(periodType);
    
    const analytics = await Analytics.findOne({
      userId: req.user._id,
      period: currentPeriod,
      periodType
    });
    
    if (!analytics) {
      return res.status(404).json({ error: 'No analytics data found. Please refresh analytics first.' });
    }
    
    res.json(analytics.metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/compare', auth, async (req, res) => {
  try {
    const { periodType = 'monthly', periods = 6 } = req.query;
    
    const analytics = await Analytics.find({
      userId: req.user._id,
      periodType
    })
    .sort({ period: -1 })
    .limit(parseInt(periods));
    
    const comparison = analytics.map(analytic => ({
      period: analytic.period,
      totalExpenses: analytic.spendingPatterns.totalExpenses,
      totalIncome: analytic.spendingPatterns.totalIncome,
      netCashFlow: analytic.spendingPatterns.netCashFlow,
      savingsRate: analytic.metrics.savingsRate,
      financialHealthScore: analytic.metrics.financialHealthScore,
      topCategory: analytic.spendingPatterns.categoryBreakdown
        .sort((a, b) => b.amount - a.amount)[0]?.category || 'N/A'
    }));
    
    res.json(comparison.reverse()); 
  } catch (error) {
    console.error('Error fetching comparative analysis:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/compute', auth, async (req, res) => {
  try {
    const { periodType = 'monthly' } = req.body;
    
    const analytics = await AnalyticsService.computeAnalytics(req.user._id, periodType);
    
    res.json({
      message: 'Analytics computed successfully',
      analytics
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    res.status(500).json({ error: error.message });
  }
});


function isDataStale(computedAt, maxAgeHours = 24) {
  const now = new Date();
  const dataAge = (now - computedAt) / (1000 * 60 * 60); 
  return dataAge > maxAgeHours;
}

module.exports = router;

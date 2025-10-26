import { successResponse } from '../utils/response.js';
import * as dashboardService from '../services/dashboardService.js';

// Helper function to get default dates
const getDefaultDates = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

export const getDashboardOverview = async (req, res, next) => {
  try {
    const defaults = getDefaultDates();
    const startDate = req.query.start_date || defaults.startDate;
    const endDate = req.query.end_date || defaults.endDate;
    
    const overview = await dashboardService.getDashboardOverview(startDate, endDate);
    return successResponse(res, overview);
  } catch (error) {
    console.error('Dashboard overview controller error:', error);
    next(error);
  }
};

export const getRevenueReport = async (req, res, next) => {
  try {
    const defaults = getDefaultDates();
    const startDate = req.query.start_date || defaults.startDate;
    const endDate = req.query.end_date || defaults.endDate;
    
    const report = await dashboardService.getRevenueReport(startDate, endDate);
    return successResponse(res, report);
  } catch (error) {
    console.error('Revenue report controller error:', error);
    next(error);
  }
};

export const getTopProducts = async (req, res, next) => {
  try {
    const defaults = getDefaultDates();
    const startDate = req.query.start_date || defaults.startDate;
    const endDate = req.query.end_date || defaults.endDate;
    const limit = parseInt(req.query.limit) || 10;
    
    const products = await dashboardService.getTopProducts(startDate, endDate, limit);
    return successResponse(res, products);
  } catch (error) {
    console.error('Top products controller error:', error);
    next(error);
  }
};

export const getNewCustomers = async (req, res, next) => {
  try {
    const defaults = getDefaultDates();
    const startDate = req.query.start_date || defaults.startDate;
    const endDate = req.query.end_date || defaults.endDate;
    
    const customers = await dashboardService.getNewCustomers(startDate, endDate);
    return successResponse(res, customers);
  } catch (error) {
    console.error('New customers controller error:', error);
    next(error);
  }
};

export const getRecentOrdersController = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const orders = await dashboardService.getRecentOrders(limit);
    return successResponse(res, orders);
  } catch (error) {
    console.error('Recent orders controller error:', error);
    next(error);
  }
};

export const getDashboardSummary = async (req, res, next) => {
  try {
    const defaults = getDefaultDates();
    const startDate = req.query.start_date || defaults.startDate;
    const endDate = req.query.end_date || defaults.endDate;
    
    const summary = await dashboardService.getDashboardSummary(startDate, endDate);
    return successResponse(res, summary);
  } catch (error) {
    console.error('Dashboard summary controller error:', error);
    next(error);
  }
};

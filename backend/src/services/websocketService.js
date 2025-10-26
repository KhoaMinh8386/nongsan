import { WebSocketServer } from 'ws';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { verifyToken } from '../utils/jwt.js';

dotenv.config();

const clients = new Map(); // userId -> WebSocket connection

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  console.log('🔌 WebSocket server initialized');
  
  wss.on('connection', async (ws, req) => {
    let userId = null;
    let userRole = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'auth') {
          const { token } = data;
          
          if (!token) {
            ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
            return;
          }
          
          try {
            const decoded = verifyToken(token);
            userId = decoded.id;
            userRole = decoded.role;
            
            // Store connection
            clients.set(userId, { ws, role: userRole });
            
            ws.send(JSON.stringify({ 
              type: 'auth_success', 
              message: 'Authenticated',
              userId,
              role: userRole
            }));
            
            console.log(`✅ WebSocket client authenticated: ${userId} (${userRole})`);
          } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            ws.close();
          }
        }
        
        // Handle ping/pong for keep-alive
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`🔌 WebSocket client disconnected: ${userId}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Setup PostgreSQL LISTEN for realtime notifications
  setupPostgreSQLNotifications();
  
  return wss;
}

function setupPostgreSQLNotifications() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  
  client.connect().then(() => {
    console.log('📡 PostgreSQL LISTEN client connected');
    
    // Listen for order status changes
    client.query('LISTEN order_status_changed');
    
    // Listen for new orders
    client.query('LISTEN new_order_created');
    
    // Listen for return requests
    client.query('LISTEN return_requested');
    
    client.on('notification', (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        
        if (msg.channel === 'order_status_changed') {
          handleOrderStatusChange(payload);
        } else if (msg.channel === 'new_order_created') {
          handleNewOrder(payload);
        } else if (msg.channel === 'return_requested') {
          handleReturnRequested(payload);
        }
      } catch (error) {
        console.error('Notification handling error:', error);
      }
    });
    
  }).catch(error => {
    console.error('❌ PostgreSQL LISTEN connection failed:', error);
  });
}

function handleOrderStatusChange(payload) {
  const { order_id, order_code, customer_id, shipper_id, old_status, new_status } = payload;
  
  console.log(`📢 Order ${order_code}: ${old_status} → ${new_status}`);
  
  // Notify customer
  if (customer_id) {
    const customerClient = clients.get(customer_id);
    if (customerClient) {
      customerClient.ws.send(JSON.stringify({
        type: 'order_status_update',
        data: {
          order_id,
          order_code,
          old_status,
          new_status,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }
  
  // Notify shipper
  if (shipper_id) {
    const shipperClient = clients.get(shipper_id);
    if (shipperClient) {
      shipperClient.ws.send(JSON.stringify({
        type: 'order_status_update',
        data: {
          order_id,
          order_code,
          old_status,
          new_status,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }
  
  // Notify all admins
  clients.forEach((client, userId) => {
    if (client.role === 'ADMIN' || client.role === 'STAFF') {
      client.ws.send(JSON.stringify({
        type: 'order_status_update',
        data: {
          order_id,
          order_code,
          customer_id,
          shipper_id,
          old_status,
          new_status,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
}

function handleNewOrder(payload) {
  const { order_id, order_code, customer_id, status, grand_total } = payload;
  
  console.log(`🆕 New order created: ${order_code}`);
  
  // Notify all shippers
  clients.forEach((client, userId) => {
    if (client.role === 'SHIPPER') {
      client.ws.send(JSON.stringify({
        type: 'new_order',
        data: {
          order_id,
          order_code,
          status,
          grand_total,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
  
  // Notify admins
  clients.forEach((client, userId) => {
    if (client.role === 'ADMIN' || client.role === 'STAFF') {
      client.ws.send(JSON.stringify({
        type: 'new_order',
        data: {
          order_id,
          order_code,
          customer_id,
          status,
          grand_total,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
}

function handleReturnRequested(payload) {
  const { return_id, order_id, order_code, customer_id, reason } = payload;
  
  console.log(`🔄 Return requested for order: ${order_code}`);
  
  // Notify all admins about return request
  clients.forEach((client, userId) => {
    if (client.role === 'ADMIN' || client.role === 'STAFF') {
      client.ws.send(JSON.stringify({
        type: 'return_requested',
        data: {
          return_id,
          order_id,
          order_code,
          customer_id,
          reason,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
  
  // Notify customer
  if (customer_id) {
    const customerClient = clients.get(customer_id);
    if (customerClient) {
      customerClient.ws.send(JSON.stringify({
        type: 'return_created',
        data: {
          return_id,
          order_id,
          order_code,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }
}

export { clients };

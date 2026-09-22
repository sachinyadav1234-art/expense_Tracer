import { io } from 'socket.io-client';

const checkIsLocal = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '[::1]' || 
         hostname === '::1' ||
         hostname.endsWith('.local') ||
         /^192\.168\./.test(hostname) ||
         /^10\./.test(hostname) ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
};

const getSocketURL = () => {
  let savedURL = localStorage.getItem('server_url');
  const isLocal = checkIsLocal();

  if (isLocal && savedURL && savedURL.includes('onrender.com')) {
    localStorage.removeItem('server_url');
    savedURL = null;
  }

  if (savedURL) {
    return savedURL.replace(/\/api\/?$/, '');
  }

  const isNative = !!window.Capacitor?.isNative;
  if (isNative) {
    return 'http://10.0.2.2:5000';
  }
  if (isLocal) {
    return `http://${window.location.hostname || 'localhost'}:5000`;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'https://expense-tracer-8i63.onrender.com/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const url = getSocketURL();
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }
  return socket;
};

export const joinGroupRoom = (groupId) => {
  const s = getSocket();
  if (s && groupId) {
    s.emit('join-group', groupId);
  }
};

export const leaveGroupRoom = (groupId) => {
  const s = getSocket();
  if (s && groupId) {
    s.emit('leave-group', groupId);
  }
};

export const subscribeToGroupUpdates = (groupId, onUpdate) => {
  const s = getSocket();
  joinGroupRoom(groupId);

  const handler = (data) => {
    if (data && (!data.groupId || data.groupId === groupId)) {
      onUpdate(data);
    }
  };

  s.on('group-updated', handler);

  return () => {
    s.off('group-updated', handler);
    leaveGroupRoom(groupId);
  };
};

export const subscribeToGroupsListChanges = (onChanged) => {
  const s = getSocket();
  s.on('groups-changed', onChanged);
  return () => {
    s.off('groups-changed', onChanged);
  };
};

export default {
  getSocket,
  joinGroupRoom,
  leaveGroupRoom,
  subscribeToGroupUpdates,
  subscribeToGroupsListChanges
};

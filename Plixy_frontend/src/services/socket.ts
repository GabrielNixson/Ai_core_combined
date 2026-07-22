// import { io } from 'socket.io-client';

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// export const socket = io(SOCKET_URL, {
//   autoConnect: false,
// });

// export default socket;


import { io, Socket } from "socket.io-client";

let socket: Socket;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function connectSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
  }
  return socket;
}
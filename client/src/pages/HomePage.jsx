import React, { useState, useEffect } from 'react';
import { socket } from '../lib/socket';

const HomePage = () => {
  const [apiStatus, setApiStatus] = useState('Cargando estado del servidor...');

  const [isConnected, setIsConnected] = useState(socket.connected);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/api/healthcheck')
      .then(res => res.json())
      .then(data => {
        setApiStatus(`${data.message}`);
      })
      .catch(err => {
        console.error("Error al conectar con la API:", err);
        setApiStatus("No se pudo conectar con el servidor.");
      });
  }, []);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      console.log('Conectado al servidor de sockets!');
    }

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Desconectado del servidor de sockets.');
    }

    const onWelcome = (data) => {
      setWelcomeMessage(data.message);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connected', onWelcome);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connected', onWelcome);
    };
  }, []);

  const sendPing = () => {
    console.log("Enviando ping al servidor...");
    socket.emit('ping');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-800 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Rendezvous</h1>

      <div className="w-full max-w-md p-4 mb-6 bg-gray-700 rounded-lg shadow">
        <h2 className="text-lg font-semibold border-b border-gray-600 pb-2 mb-2">Estado de la API</h2>
        <p className="text-gray-300">{apiStatus}</p>
      </div>

      <div className="w-full max-w-md p-4 bg-gray-700 rounded-lg shadow">
        <h2 className="text-lg font-semibold border-b border-gray-600 pb-2 mb-2">Conexión WebSocket</h2>
        <p>
          Estado: {isConnected ? <span className="text-green-400">Conectado</span> : <span className="text-red-400">Desconectado</span>}
        </p>
        {welcomeMessage && <p className="text-blue-300 mt-2">Server dice: "{welcomeMessage}"</p>}
        <button
          onClick={sendPing}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Enviar Ping de Prueba
        </button>
      </div>
    </div>
  );
};

export default HomePage;
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function App() {
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    socket.on('offer', async (offer) => {
      await peerConnection.current.setRemoteDescription(offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', { room, answer });
    });

    socket.on('answer', async (answer) => {
      await peerConnection.current.setRemoteDescription(answer);
    });

    socket.on('ice-candidate', async (candidate) => {
      try {
        await peerConnection.current.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [room]);

  const joinRoom = async () => {
    if (room.trim()) {
      socket.emit('joinRoom', room);
      setJoined(true);

      // Initialize peer connection
      peerConnection.current = new RTCPeerConnection(configuration);

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { room, candidate: event.candidate });
        }
      };

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
    }
  };

  const createOffer = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit('offer', { room, offer });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h2 className="text-2xl font-semibold mb-4">WebRTC Video Chat</h2>
      <input
        type="text"
        className="w-1/2 p-2 mb-4 border rounded"
        placeholder="Enter room name"
        value={room}
        onChange={(e) => setRoom(e.target.value)}
      />
      {!joined ? (
        <button
          onClick={joinRoom}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Join Room
        </button>
      ) : (
        <button
          onClick={createOffer}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Start Call
        </button>
      )}
      <div className="flex mt-4">
        <video ref={localVideoRef} autoPlay playsInline className="w-1/2 border rounded mr-2" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2 border rounded" />
      </div>
    </div>
  );
}

export default App;

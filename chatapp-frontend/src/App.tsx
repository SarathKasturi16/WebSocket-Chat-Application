import { useEffect, useState, useRef } from "react";

type Message = {
  text: string;
  type: "sent" | "received";
  sender?: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connectToRoom = () => {
    if (!roomId.trim() || !username.trim()) return;

    wsRef.current = new WebSocket("ws://localhost:8080");
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      wsRef.current?.send(JSON.stringify({
        type: "join",
        payload: {
          roomId: roomId.trim(),
          username: username.trim()
        }
      }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "chat") {
        setMessages(prev => [...prev, {
          text: data.payload.message,
          type: data.payload.sender === username ? "sent" : "received",
          sender: data.payload.sender
        }]);
      } else if (data.type === "system") {
        setMessages(prev => [...prev, {
          text: data.message,
          type: "received"
        }]);
      }
    };

    wsRef.current.onclose = () => setIsConnected(false);
    wsRef.current.onerror = (error) => console.error("WebSocket error:", error);
  };

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (inputMessage.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chat",
        payload: {
          message: inputMessage.trim()
        }
      }));
      setInputMessage("");
    }
  };

  const leaveRoom = () => {
    wsRef.current?.close();
    setIsConnected(false);
    setMessages([]);
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center h-full space-y-4 p-4">
          <h1 className="text-2xl font-bold text-gray-100">Join Chat Room</h1>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            className="w-full max-w-md bg-gray-800 text-gray-200 rounded-lg px-4 py-2 border border-gray-700"
          />
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room name"
            className="w-full max-w-md bg-gray-800 text-gray-200 rounded-lg px-4 py-2 border border-gray-700"
          />
          <button
            onClick={connectToRoom}
            disabled={!roomId.trim() || !username.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            Join Room
          </button>
        </div>
      ) : (
        <>
          <div className="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
            <div>
              <h2 className="text-gray-200">Room: {roomId}</h2>
              <p className="text-xs text-gray-400">Connected as: {username}</p>
            </div>
            <button 
              onClick={leaveRoom}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Leave Room
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === "sent" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-gray-100 ${
                  message.type === "sent" ? "bg-indigo-900" : "bg-gray-900"
                }`}>
                  {message.sender && message.type === "received" && (
                    <p className="text-xs text-indigo-300 mb-1">{message.sender}</p>
                  )}
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t border-gray-800 bg-gray-900">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..." 
                className="flex-1 bg-gray-800 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-700 border border-gray-700 placeholder-gray-500"
              />
              <button 
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
                className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-indigo-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
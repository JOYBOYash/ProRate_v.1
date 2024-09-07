"use client";
import { Image } from "next/image";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! i'm the rate my professor support assistant. How can I help you today? ",
    },
  ]);
  const [message, setMessage] = useState("");
  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setMessage("");
    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = "";
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });

        return reader.read().then(processText);
      });
    });
  };
  return (
    <>
      <div className="w-full h-full flex flex-col justify-center items-center">
        <div className="flex flex-col w-auto h-auto p-30 border-2 gap-3 ">
          {messages.map((message, index) => {
            <div key={index} className="flex ">
              <div className="text-white rounded-lg p-4">
                {" "}
                {message.content}{" "}
              </div>
            </div>;
          })}
        </div>
      </div>
    </>
  );
}

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import dynamic from "next/dynamic";
import { ChatCompletionRequestMessage, OpenAIApi } from "openai";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletDisconnectButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletDisconnectButton,
  { ssr: false }
);

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [input, setInput] = useState("");

  async function sendMessage() {
    const new_messages = [
      ...messages,
      {
        content: input,
        role: "user",
      },
    ] as ChatCompletionRequestMessage[];
    setMessages(new_messages);
    setInput("");
  }

  return (
    <>
      <div className="container p-5 flex flex-col h-screen mx-auto">
        <div className="h-[10%]  rounded-md w-full overflow-y-auto  flex flex-row justify-end items-center gap-2">
          <button
            onClick={async () => {
              if (publicKey) {
                await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
                setMessages([
                  ...messages,
                  {
                    content: `Airdropped 1 SOL to ${publicKey.toBase58()}`,
                    role: "assistant",
                  },
                ]);
              }
            }}
            className="float-left px-5 py-2 text-white  bg-gray-700 rounded-md hover:bg-slate-600"
          >
            Airdrop me some SOL
          </button>
          <WalletDisconnectButtonDynamic />
          <WalletMultiButtonDynamic />
        </div>
        <div className="h-[75%] border border-gray-500 rounded-md w-full overflow-y-auto p-4">
          <Message
            message="Welcome to Solana Wallet Assistant"
            sender="assistant"
          />
          {messages.map((message, i) => (
            <Message message={message.content} sender={message.role} key={i} />
          ))}
        </div>
        <div className="h-[15%]  w-full flex flex-row py-5 gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message."
            className="text-white flex-1 h-full text-xl px-6 py-2 border-gray-500 rounded-md bg-gray-700 border"
          />
          <button
            onClick={sendMessage}
            className="h-full px-5 py-2 text-white text-2xl bg-gray-700 rounded-md hover:bg-slate-600"
          >
            Submit
          </button>
        </div>
      </div>
    </>
  );
}

function Message({ message, sender }: { message: string; sender: string }) {
  if (sender == "system") return <></>;

  try {
    const json = JSON.parse(message);
    return (
      <div className="flex flex-row py-1">
        <div className="flex flex-col border border-blue-500 rounded-md w-full p-2">
          <div className="text-white mb-2">Action: {json.action}</div>
          {Object.keys(json.params).map((key, i) => (
            <div key={i} className="text-white text-sm">
              <span className="text-gray-500 ">{key}:</span> {json.params[key]}
            </div>
          ))}
        </div>
      </div>
    );
  } catch {}

  return (
    <div className="flex flex-row py-1">
      <div className="flex flex-col border-b border-b-[#4b4b4baa] w-full py-2">
        <div className="text-gray-500">{sender}</div>
        <div className="text-white text-xl">{message}</div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import dynamic from "next/dynamic";
import ActionableChatbot from "@utils/ActionableChatbot";
import { ApiKeys } from "@utils/ApiKeys";

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
  const [messages, setMessages] = useState<JSX.Element[]>([
    <Message
      message="Welcome to Solana Wallet Assistant, connect your wallet to get started."
      sender="assistant"
    />,
  ]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (publicKey) {
      setMessages([
        <Message
          message={"Connected to wallet: " + publicKey.toBase58()}
          sender="assistant"
        />,
      ]);
    }
  }, [publicKey]);

  async function sendMessage() {
    if (!input) return;
    const user_input = input;
    setInput("");
    setMessages((prevMessages) => [
      ...prevMessages,
      <Message message={user_input} sender="user" />,
    ]);
  }

  return (
    <>
      <div className="container p-5 flex flex-col h-screen mx-auto">
        <div className="h-[10%] rounded-md w-full flex flex-row justify-end items-center gap-2">
          <WalletDisconnectButtonDynamic />
          <WalletMultiButtonDynamic />
        </div>
        <div className="h-[75%] border border-gray-500 rounded-md w-full overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div key={index}>{message}</div>
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
            disabled={!publicKey}
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
  return (
    <div className="flex flex-row py-1">
      <div className="flex flex-col border-b border-b-[#4b4b4baa] w-full py-2">
        <div className="text-gray-500">{sender}</div>
        <div className="text-white text-xl">{message}</div>
      </div>
    </div>
  );
}

function Action({
  title,
  data,
}: {
  title: string;
  data?: { name: string; value: string }[];
}) {
  return (
    <div className="flex flex-row py-1">
      <div className="flex flex-col border-b border-b-[#6a44e9aa] w-full py-2">
        <div className="text-gray-500">{title}</div>
        <div className="text-white text-sm">
          {data?.map((d, index) => (
            <div key={index}>
              {d.name}: {d.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

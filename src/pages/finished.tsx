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

  const chatbot = new ActionableChatbot({
    apiKey: ApiKeys.apikey,
    org: ApiKeys.org,
    engine: "gpt-4",
  });

  chatbot.addAction({
    name: "airdrop",
    description: "Airdrop some SOL to the connected wallet address",
    params: [],
    function: async () => {
      try {
        const tx = await connection.requestAirdrop(
          publicKey!,
          LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(tx);
        setMessages((prevMessages) => [
          ...prevMessages,
          <Action
            title="Airdrop Successful"
            data={[{ name: "tx", value: tx.toString() }]}
          />,
        ]);
        return "Airdrop of 1 SOL was successful.";
      } catch (e) {
        setMessages((prevMessages) => [
          ...prevMessages,
          <Action title="Airdrop Failed" />,
        ]);
        return "Airdrop of 1 SOL was not successful and failed.";
      }
    },
  });

  chatbot.addAction({
    name: "balance",
    description: "Get the balance of the requested wallet address",
    params: [
      {
        name: "address",
        type: "string",
        description: "The solana wallet address to get the balance of",
      },
    ],
    function: async (params: { address: string }) => {
      try {
        const balance = await connection.getBalance(
          new PublicKey(params.address)
        );
        setMessages((prevMessages) => [
          ...prevMessages,
          <Action
            title="Balance"
            data={[
              { name: "address", value: params.address },
              { name: "balance", value: "" + balance / LAMPORTS_PER_SOL },
            ]}
          />,
        ]);
        return (
          "Balance of address + " +
          params.address +
          " is " +
          balance / LAMPORTS_PER_SOL
        );
      } catch (e) {
        setMessages((prevMessages) => [
          ...prevMessages,
          <Action title="Balance Failed" />,
        ]);
        return "Balance of the connected wallet failed.";
      }
    },
  });

  chatbot.addAction({
    name: "transfer",
    description: "Transfer SOL to another wallet address",
    params: [
      {
        name: "address",
        type: "string",
        description: "The solana wallet address to transfer to",
      },
      {
        name: "amount",
        type: "number",
        description: "The amount of SOL to transfer",
      },
    ],
    function: async (params: { address: string; amount: number }) => {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey!,
          toPubkey: new PublicKey(params.address),
          lamports: params.amount * LAMPORTS_PER_SOL,
        })
      );

      try {
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature);

        setMessages((prevMessages) => [
          ...prevMessages,
          <Action
            title="Transfer"
            data={[
              { name: "address", value: params.address },
              { name: "amount", value: "" + params.amount },
              { name: "tx", value: signature.toString() },
            ]}
          />,
        ]);
        return (
          "Transfer of " +
          params.amount +
          " SOL to " +
          params.address +
          " was successful."
        );
      } catch (e) {
        setMessages((prevMessages) => [
          ...prevMessages,
          <Action title="Transfer Failed" />,
        ]);
        return (
          "Transfer of " +
          params.amount +
          " SOL to " +
          params.address +
          " was not successful and failed."
        );
      }
    },
  });

  useEffect(() => {
    if (publicKey) {
      setMessages([
        <Message
          message={"Connected to wallet: " + publicKey.toBase58()}
          sender="assistant"
        />,
      ]);
      chatbot.clearData();
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
    const returned = await chatbot.input(user_input, [
      { name: "Users Solana Address", value: publicKey?.toBase58() || "" },
    ]);
    console.log(returned);

    switch (returned.action) {
      case "chat":
        chatAction(returned.params.message);
        break;
      default:
        break;
    }
  }

  function chatAction(message: string) {
    setMessages((prevMessages) => [
      ...prevMessages,
      <Message message={message} sender="assisant" />,
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

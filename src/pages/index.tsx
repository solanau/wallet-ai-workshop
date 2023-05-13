import { useState } from "react";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import dynamic from "next/dynamic";
import { ChatCompletionRequestMessage, OpenAIApi } from "openai";
import { openai_config } from "@constant";

const openai = new OpenAIApi(openai_config);

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

    callOpenAI(new_messages);
  }

  async function callOpenAI(new_messages: ChatCompletionRequestMessage[]) {
    const prompt = `
    You are a wallet management chatbot for Solana wallets. You will communicate with users and ask questions and gather what they want to do, if you have enough info to perform an action, you will return a JSON based command to execute the action and return data.

    The public key of the user you are interacting with is: ${publicKey?.toBase58()}
    
    Here is the list of actions you can execute and the JSON schema to perform the action
    
     Transfer:
    
    Example user input: "Transfer 2 SOL to 3r5Gm75SJLPS533qcAusXmWRbAHneCNkq35tWghR9gQe"
    
    Example Output (ONLY RESPOND WITH JSON if you want to perform an action, no leading text, nothing else, be brief.): 
    
    {
    action: "transfer",
    params: {
    "amount": 2,
    "to":  "3r5Gm75SJLPS533qcAusXmWRbAHneCNkq35tWghR9gQe",
    }
    }
    
    Balance:
    
    Example user input: "how much sol does 6nqJTS74Kn12tBEWWSQvDsnDMhTCvf5WrNpK9xGXBC1S have? "
    
    Example Output (ONLY RESPOND WITH JSON if you want to perform an action, no leading text, nothing else, be brief.): 
    
    {
    action: "balance",
    params: {
    "address":  "6nqJTS74Kn12tBEWWSQvDsnDMhTCvf5WrNpK9xGXBC1S",
    }
    }
    
    respond with just "yes" or "No" if you understand the above instructions
    `;

    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a wallet management chatbot for Solana wallets. Listen to the users prompt and respond accordingly.",
        },
        {
          role: "user",
          content: prompt,
        },
        {
          role: "assistant",
          content: "Yes",
        },
        ...new_messages,
      ],
    });

    const returned_message = response.data.choices[0].message?.content || "";
    new_messages.push({
      content: returned_message,
      role: "assistant",
    });
    try {
      const json = JSON.parse(returned_message);

      if (json.action == "balance") {
        const balance = await connection.getBalance(
          new PublicKey(json.params.address)
        );
        new_messages.push({
          content: `The balance of ${
            json.params.address
          } is ${balance} lamports or ${balance / LAMPORTS_PER_SOL} SOL`,
          role: "system",
        });

        callOpenAI(new_messages);
      }
      if (json.action == "transfer") {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey!,
            toPubkey: new PublicKey(json.params.to),
            lamports: json.params.amount * LAMPORTS_PER_SOL,
          })
        );
        const signature = await sendTransaction(transaction, connection);
        new_messages.push({
          content: `Transfered ${json.params.amount} SOL to ${json.params.to} with signature ${signature}`,
          role: "system",
        });
        callOpenAI(new_messages);
      }
    } catch {}
    setMessages([...new_messages]);
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

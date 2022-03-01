import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constants";

interface DataFormInterface {
  addressTo: string;
  amount: string;
  keyword: string;
  message: string;
}

interface TransactionInterface {
  addressTo: string;
  addressFrom: string;
  timestamp: string;
  message: string;
  keyword: string;
  amount: number;
}

export const TransactionContext = React.createContext<{
  connectWallet: () => Promise<void>;
  currentAccount: string;
  formData: DataFormInterface;
  sendTransaction: () => Promise<void>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>, name: string | undefined) => void;
  transactions: TransactionInterface[];
  isLoading: boolean;
}>({
  connectWallet: async () => {},
  currentAccount: "",
  formData: { addressTo: "", amount: "", keyword: "", message: "" },
  sendTransaction: async () => {},
  handleChange: () => {},
  transactions: [],
  isLoading: false,
});

declare global {
  interface Window {
    ethereum: any;
    reload: any;
  }
}

const { ethereum } = window;

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionsContract = new ethers.Contract(contractAddress, contractABI, signer);

  return transactionsContract;
};

export const TransactionProvider: React.FC = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState<string>("");
  const [formData, setFormData] = useState<DataFormInterface>({ addressTo: "", amount: "", keyword: "", message: "" });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transactionCount, setTransactionCount] = useState<string | null>(localStorage.getItem("transactionCount"));
  const [transactions, setTransactions] = useState<TransactionInterface[]>([]);

  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfTransactionsExist();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, name: string | undefined) => {
    if (name) setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const transactionsContract = getEthereumContract();

      const availableTransactions = await transactionsContract.getAllTransactions();

      const structuredTransactions: TransactionInterface[] = availableTransactions.map((transaction: any) => ({
        addressTo: transaction.receiver,
        addressFrom: transaction.sender,
        timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
        message: transaction.message,
        keyword: transaction.keyword,
        amount: parseInt(transaction.amount._hex) / 10 ** 18,
      }));

      setTransactions(structuredTransactions);
      console.log(structuredTransactions);
    } catch (error) {
      console.log(error);
      throw new Error("No Ethereum object");
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);

        getAllTransactions();
      } else {
        console.log("No accounts found");
      }

      console.log(accounts);
    } catch (error) {
      console.error(error);
      throw new Error("No Ethereum object");
    }
  };

  const checkIfTransactionsExist = async () => {
    try {
      const transactionsContract = getEthereumContract();
      const transactionCount = await transactionsContract.getTransactionCount();

      window.localStorage.setItem("transactionCount", transactionCount);
    } catch (error) {
      console.error(error);
      throw new Error("No Ethereum object");
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.error(error);
      throw new Error("No Ethereum object");
    }
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const { addressTo, amount, keyword, message } = formData;
      const transactionsContract = getEthereumContract();
      const parsedAmount = ethers.utils.parseEther(amount);

      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: "0x5208",
            value: parsedAmount._hex,
          },
        ],
      });

      const transactionHash = await transactionsContract.addToBlockChain(addressTo, parsedAmount, message, keyword);

      setIsLoading(true);
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      setIsLoading(false);
      console.log(`Success - ${transactionHash.hash}`);

      const transactionCount = await transactionsContract.getTransactionCount();

      setTransactionCount(transactionCount.toNumber());

      window.reload();
    } catch (error) {
      console.error(error);
      throw new Error("No Ethereum object");
    }
  };

  return (
    <TransactionContext.Provider value={{ connectWallet, currentAccount, formData, sendTransaction, handleChange, transactions, isLoading }}>
      {children}
    </TransactionContext.Provider>
  );
};

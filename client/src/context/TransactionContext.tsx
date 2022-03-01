import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constants";

interface DataFormInterface {
  addressTo: string;
  amount: string;
  keyword: string;
  message: string;
}

export const TransactionContext = React.createContext<{
  connectWallet: () => Promise<void>;
  currentAccount: string;
  formData: DataFormInterface;
  sendTransaction: () => Promise<void>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>, name: string | undefined) => void;
}>({
  connectWallet: async () => {},
  currentAccount: "",
  formData: { addressTo: "", amount: "", keyword: "", message: "" },
  sendTransaction: async () => {},
  handleChange: () => {},
});

declare global {
  interface Window {
    ethereum: any;
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
  const [transactionCount, setTransactionCount] = useState<string | null>(localStorage.getItem('transactionCount'));

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, name: string | undefined) => {
    if (name) setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);

        //getAllTransactions();
      } else {
        console.log("No accounts found");
      }

      console.log(accounts);
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
        params: [{
          from: currentAccount,
          to: addressTo,
          gas: "0x5208",
          value: parsedAmount._hex,
        }],
      });

      const transactionHash = await transactionsContract.addToBlockChain(addressTo, parsedAmount, message, keyword);
      
      setIsLoading(true);
      console.log(`Loading - ${transactionHash.hash}`)
      await transactionHash.wait();
      setIsLoading(false);
      console.log(`Success - ${transactionHash.hash}`)

      const transactionCount = await transactionsContract.getTransactionCount();

      setTransactionCount(transactionCount.toNumber());

    } catch (error) {
      console.error(error);
      throw new Error("No Ethereum object");
    }
  };

  return (
    <TransactionContext.Provider value={{ connectWallet, currentAccount, formData, sendTransaction, handleChange }}>{children}</TransactionContext.Provider>
  );
};

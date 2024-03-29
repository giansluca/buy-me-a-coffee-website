/* eslint-disable react-hooks/exhaustive-deps */
import Head from "next/head";
import { useEffect, useState } from "react";
import { ethers, BrowserProvider, Contract } from "ethers";
import styles from "../styles/Home.module.css";
import abi from "../utils/abi/BuyMeACoffee.json";

export default function Home() {
    // Contract Address & ABI
    const contractAddress = process.env.contractAddress;
    const contractABI = abi.abi;

    // Component state
    const [currentAccount, setCurrentAccount] = useState("");
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [memos, setMemos] = useState([]);

    const onNameChange = (event) => {
        setName(event.target.value);
    };

    const onMessageChange = (event) => {
        setMessage(event.target.value);
    };

    const onNewMemo = (from, timestamp, name, message) => {
        console.log("Memo received: ", from, timestamp, name, message);
        setMemos((prevState) => [
            ...prevState,
            {
                from,
                timestamp,
                name,
                message,
            },
        ]);
    };

    const onAccountChange = async (accounts) => {
        if (accounts.length == 0) return;
        const account = await connectWallet();
        setCurrentAccount(account);
    };

    const formatDate = (timestamp) => {
        return new Intl.DateTimeFormat("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(1000 * timestamp.toString());
    };

    const isWalletConnected = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                console.log("please install MetaMask");
                return false;
            }

            const accounts = await ethereum.request({ method: "eth_accounts" });

            if (accounts.length > 0) {
                return true;
            } else {
                console.log("make sure MetaMask is connected");
                return false;
            }
        } catch (error) {
            console.log(error);
            return false;
        }
    };

    const connectWallet = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                console.log("please install MetaMask");
                return;
            }

            const accounts = await ethereum.request({ method: "eth_requestAccounts" });
            if (accounts.length > 0) {
                const account = accounts[0];
                console.log("wallet connected to: " + account);
                return account;
            } else {
                console.log("account size cannot be empty");
            }
        } catch (error) {
            console.log(error);
        }
    };

    const setUp = async () => {
        const account = await connectWallet();
        setCurrentAccount(account);

        if (!(await isWalletConnected())) return;

        const { ethereum } = window;
        const provider = new BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        const buyMeACoffee = new Contract(contractAddress, contractABI, signer);

        buyMeACoffee.on("NewMemo", function (from, timestamp, name, message) {
            onNewMemo(from, timestamp, name, message);
        });

        ethereum.on("accountsChanged", async function (accounts) {
            onAccountChange(accounts);
        });

        await getMemos();

        return buyMeACoffee;
    };

    const buyCoffee = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                console.log("Metamask is not connected");
                return;
            }

            const provider = new BrowserProvider(ethereum);
            const signer = await provider.getSigner();
            const buyMeACoffee = new Contract(contractAddress, contractABI, signer);

            console.log("buying coffee...");

            const tip = { value: ethers.parseEther("0.001") };
            const coffeeTxn = await buyMeACoffee.buyCoffee(
                name ? name : "anon",
                message ? message : "Enjoy your coffee!",
                tip,
            );

            await coffeeTxn.wait();

            console.log("mined ", coffeeTxn.hash);
            console.log("coffee purchased!");

            // Clear the form fields.
            setName("");
            setMessage("");
        } catch (error) {
            console.log(error);
        }
    };

    const getMemos = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                console.log("Metamask is not connected");
                return;
            }

            const provider = new BrowserProvider(ethereum);
            const signer = await provider.getSigner();
            const buyMeACoffee = new Contract(contractAddress, contractABI, signer);

            console.log("fetching memos from the blockchain...");
            const memos = await buyMeACoffee.getMemos();
            console.log("fetched!");
            setMemos(memos);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        let buyMeACoffee;

        const init = async () => {
            if (!(await isWalletConnected())) return;
            buyMeACoffee = await setUp();
        };

        init();

        return () => {
            console.log("unload");
            if (buyMeACoffee) {
                buyMeACoffee.off("NewMemo", onNewMemo);
            }
            if (window.ethereum) {
                window.ethereum.removeListener("accountsChanged", onAccountChange);
            }
        };
    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>Buy Gians a Coffee!</title>
                <meta name="description" content="Tipping site" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>Buy Gians a coffee! :-D</h1>

                {currentAccount ? (
                    <div>
                        <form>
                            <div>
                                <label>Name</label>
                                <br />

                                <input id="name" type="text" value={name} placeholder="anon" onChange={onNameChange} />
                            </div>
                            <br />
                            <div>
                                <label>Send Gians a message</label>
                                <br />

                                <textarea
                                    rows={3}
                                    value={message}
                                    placeholder="Enjoy your coffee!"
                                    id="message"
                                    onChange={onMessageChange}
                                    required
                                ></textarea>
                            </div>
                            <div>
                                <button type="button" onClick={buyCoffee}>
                                    Send 1 Coffee for 0.001ETH
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <button onClick={setUp}> Connect your wallet </button>
                )}
            </main>

            {currentAccount && <h1>Memos received</h1>}

            {currentAccount &&
                memos.map((memo, idx) => {
                    return (
                        <div
                            key={idx}
                            style={{ border: "2px solid", borderRadius: "5px", padding: "5px", margin: "5px" }}
                        >
                            <p style={{ fontWeight: "bold" }}>&quot;{memo.message}&quot;</p>
                            <p>
                                From: {memo.name} at: {formatDate(memo.timestamp)}
                            </p>
                        </div>
                    );
                })}

            <footer className={styles.footer}></footer>
        </div>
    );
}

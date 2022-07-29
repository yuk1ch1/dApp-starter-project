// App.js
import React, { useEffect, useState } from "react";
import "./App.css";
// ethers変数を使えるようにする
import { ethers } from "ethers";
// ABIファイルを含むWavePortal.jsonファイルをインポートする
import abi from "./utils/WavePortal.json";

const App = () => {
  /* ユーザーのパプリックウォレットを保持するために使用する状態変数を定義*/
  const [currentAccount, setCurrentAccount] = useState("");
  console.log("currentAccount: ", currentAccount);

  // デプロイされたコントラクトのデプロイ先アドレス
  const contractAddress = "0x4C18bD8949FD3E18c2C2E80F321Fc9713dE45B6c";

  // ABIのニア用を参照する変数
  const contractABI = abi.abi;

  /*window.ethereumにアクセスできることを確認*/
  const checkIfWalletIsConnected = async () => {
    try {
      // この const {}みたいなのはjsでは分割代入っていうらしい
      // ここではwindowはいろんな要素持っているけどその中のwindow.ethereumを代入している
      const { ethereum } = window;
      if (!ethereum) {
        console.log("make sure you have MetaMask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      /* ユーザーのウォレットへのアクセスが許可されているかどうかを確認 */

      // eth_accountsでアカウント接続。accountsには接続に成功したアカウントの一覧が帰ってくる
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found on authorized account; ", account);
        setCurrentAccount(account);
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // connectWalletメソッドを実装
  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Get Metamask!");
        return;
      }
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected:", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  // waveの回数をカウントする関数を実装
  const wave = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        // イーサノードと接続してノード上のスマコンとやり取りできる(read only)
        const provider = new ethers.providers.Web3Provider(ethereum);
        // 署名付きトランザクションを遅れる(read/write)
        const signer = provider.getSigner();

        // コントラクトインスタンスを生成
        const wavePortalContract = new ethers.Contract(
          contractAddress, // コントラクトのデプロイ先アドレス
          contractABI, // コントラクトのABI。コントラクトがデプロイされた時に生成される。コントラクトのインターフェースが書かれている
          signer // provider or signer 
        );

        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());

        /*
        コントラクトに👋（wave）を書き込む
        */
        const waveTxn = await wavePortalContract.wave();
        console.log("Mining...", waveTxn.hash);
        await waveTxn.wait();
        console.log("Mined--", waveTxn.hash);
        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  /*
  WEBページがロードされた時に下記の変数を実行
  */
  // Reactのものらしい。useEffectを使うと、useEffectいーしーとんに渡された関数はレンダリングの結果が画面に反映された後に動作する。
  // つまりuseEffectに書かれた処理はReactのレンダリング後に実行される
  useEffect(() => {
    // 第1引数には実行させたい副作用関数を記述
    checkIfWalletIsConnected();
  }, []); // 第2引数には副作用関数の実行タイミングを制御する依存データを記述
  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
          <span role="img" aria-label="hand-wave">
            👋
          </span>{" "}
          WELCOME!
        </div>
        <div className="bio">
          イーサリアムウォレットを接続して、「
          <span role="img" aria-label="hand-wave">
            👋
          </span>
          (wave)」を送ってください
          <span role="img" aria-label="shine">
            ✨
          </span>
        </div>
        <button className="waveButton" onClick={wave}>
          Wave at Me
        </button>
        {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
        {currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Wallet Connected
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
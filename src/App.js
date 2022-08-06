// App.js
import React, { useEffect, useState } from "react";
import './App.css';

// ethers変数を使えるようにする
import { ethers } from "ethers";
// ABIファイルを含むWavePortal.jsonファイルをインポートする
import abi from "./utils/WavePortal.json";

const App = () => {
  /* ユーザーのパプリックウォレットを保持するために使用する状態変数を定義*/
  const [currentAccount, setCurrentAccount] = useState("");
  console.log("currentAccount: ", currentAccount);

  // ユーザーのメッセージを保存するために使用する状態変数を定義
  const [messageValue, setMessageValue] = useState("");

  // 全てのwavesを保存する状態変数を定義
  const [allWaves, setAllWaves] = useState([]);

  // デプロイされたコントラクトのデプロイ先アドレス
  const contractAddress = "0x3167E6f7b7250836E6aF095a5118b0b9b2D20Fed";

  // ABIの要素を参照する変数
  const contractABI = abi.abi;

  const getAllWaves = async () => {
    const { ethereum } = window;

    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        // コントラクトからgetAllWavesメソッドを呼び出す
        const waves = await wavePortalContract.getAllWaves();
        // UIに必要なのは、アドレス、タイムスタンプ、メッセージだけなのでそれらを抽出
        const wavesCleaned = waves.map((wave) => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message,
          };
        });
        // React Stateにデータを格納する
        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!")
      }
    } catch (error) {
      console.log(error);
    }
  };

  // useEffectは複数持たせることができるっぽい
  // こっちのuseEffectはemitされたイベントに反応する物だから責務を分けてるのかもしれない
  useEffect(() => {
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };

    // NewWaveイベントがコントラクトから発信された時に情報を受け取る
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // コントラクトのインスタンスを生成し、コントラクへの接続をしている
      wavePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      // ここで多分イベントリスナーが設定されているから、NewWaveのイベントがコントラクトから送られてきた時にonNewWaveが実行されるっぽい
      wavePortalContract.on("NewWave", onNewWave);
    }

    // メモリリークを防ぐために、NewWaveのイベントを解除する
    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, []);

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
        getAllWaves();
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

        // コントラクトの現在の資金残高を確認
        let contractBalance = await provider.getBalance(wavePortalContract.address);
        console.log("Contract balance:", ethers.utils.formatEther(contractBalance));

        /*
        コントラクトに👋（wave）を書き込む
        */
        const waveTxn = await wavePortalContract.wave(messageValue, {
          gasLimit: 300000, // ガス量がガスリミットで設定した値以上になった場合に処理が強制的に中断される。
        });
        console.log("Mining...", waveTxn.hash);
        await waveTxn.wait();
        console.log("Mined--", waveTxn.hash);
        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());

        let contractBalance_post = await provider.getBalance(
          wavePortalContract.address
        );
        /* コントラクトの残高が減っていることを確認 */
        if (contractBalance_post.lt(contractBalance)) {
          /* 減っていたら下記を出力 */
          console.log("User won ETH!");
        } else {
          console.log("User didn't win ETH.");
        }
        console.log(
          "Contract balance after wave:",
          ethers.utils.formatEther(contractBalance_post)
        );
        
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  /*
  Reactのものらしい
  useEffectに渡された関数はレンダリングの結果が画面に反映された後に動作する。
  つまりuseEffectに書かれた処理はWEBページがロードされて、Reactのレンダリングが終わった後に実行される
  */
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
          イーサリアムウォレットを接続して、メッセージを作成したら
          <span role="img" aria-label="hand-wave">
            👋
          </span>
          を送ってください
          <span role="img" aria-label="shine">
            ✨
          </span>
        </div>
        <br />
        {/* ウォレットコネクトボタンを実装 */}
        {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
        {currentAccount && (
          <button className="waveButton">Wallet Connected</button>
        )}
        {/* waveボタンにwave関数を連動 */}
        {currentAccount && (
          <button className="waveButton" onClick={wave}>
            Wave at Me
          </button>
        )}
        {/*
         メッセージボックスを実装
         * 認証済みアドレスであるcurrentAccountが存在する場合に、テキストボックスをUIに表示する仕様
        */}
        {currentAccount && (
          <textarea
            name="messageArea"
            placeholder="メッセージはこちら"
            type="text"
            id="message"
            value={messageValue}
            onChange={(e) => setMessageValue(e.target.value)}
          />
        )}
        {/* 履歴を表示する */}
        {currentAccount &&
          allWaves
            .slice(0)
            .reverse()
            .map((wave, index) => {
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F8F8FF",
                    marginTop: "16px",
                    padding: "8px",
                  }}>
                  <div>Address: {wave.address}</div>
                  <div>Time: {wave.timestamp.toString()}</div>
                  <div>Message: {wave.message}</div>
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default App;

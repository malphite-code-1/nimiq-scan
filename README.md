1. install node 16
```
sudo apt update
sudo apt install curl ca-certificates -y
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
source ~/.bashrc
nvm install 16
```

2. Change config to your setting (server/config.json)
```
{
    "start": "1", // Private key range start
    "end": "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140", // Private key range end
    "wallet": "NQ08 SUEH T0GS PCDJ HUNX Q50H B0M0 ABHA PP03", // Your wallet to receive Nimiq from found wallet
    "threads": 4, // Threads use for scan
    "mode": "random" // sequential | random
}
```

3. Open terminal and start Nimiq Node
```
cd server
node index.js
```

4. Open another terminal on "nimiq-wallet-finder" and start scan
```
node app.js
```

```
6qORAIKm0asA8qWb
```
const { v4 } = require('uuid');

class Web3 {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.socket = new WebSocket(endpoint);
    this.started = false;
    this.promises = new Map();

    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({
        method: 'wallet_init',
        id: uuidv4(),
        params: {}
      }));
      this.started = true;
    });

    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      const { id, method } = data;
      if (this.promises.has(id)) {
        const { resolve, handler } = this.promises.get(id);
        handler(data);
        this.promises.delete(id);
        resolve(data.data);
      }
    });
  }

  close() {
    this.socket.close();
    this.started = false;
    this.socket = null;
    this.promises.clear();
  }

  async getBalances(addresses) {
    const id = uuidv4();
    const payload = {
      id,
      method: 'wallet_getBalance',
      params: { addresses }
    };

    this.socket.send(JSON.stringify(payload));

    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.method === 'wallet_getBalance') {
          resolve(data.balances);
        }
      };
      this.promises.set(id, { resolve, handler });
    });
  }

  async send(receiver, privateKey) {
    const id = uuidv4();
    const payload = {
      id,
      method: 'wallet_createTransaction',
      params: { privateKey, receiver }
    };

    this.socket.send(JSON.stringify(payload));

    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.method === 'wallet_createTransaction') {
          resolve(data);
        }
      };
      this.promises.set(id, { resolve, handler });
    });
  }
}

module.exports = Web3;

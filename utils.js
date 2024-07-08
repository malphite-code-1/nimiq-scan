const crypto = require('crypto');
const { default: axios } = require('axios');
const NimiqWallet = require('nimiqscan-wallet').default;
const EdDSA = require('elliptic').eddsa
const ec = new EdDSA('ed25519')

const fromPrivateKey = (privateKeyHex) => {
    const publicKeyArray = ec.keyFromSecret(privateKeyHex).getPublic()
    const publicKeyHex = Buffer.from(publicKeyArray).toString('hex')
    return NimiqWallet.fromMasterKey(privateKeyHex + publicKeyHex)
}

const getRandomBigIntInRange = (min, max) => {
    const minBigInt = BigInt(min);
    const maxBigInt = BigInt(max);

    const range = maxBigInt - minBigInt + 1n;

    // Generate a random buffer of appropriate size
    const randomBuffer = crypto.randomBytes(range.toString(16).length / 2);

    // Convert the buffer to a BigInt
    let randomBigInt = BigInt('0x' + randomBuffer.toString('hex'));

    // Ensure the randomBigInt is within the range [0, range - 1]
    randomBigInt = randomBigInt % range;

    // Adjust to the desired range and add minBigInt
    const result = minBigInt + randomBigInt;

    return result;
}

const generateRandomPrivateKey = (min, max) => {
    const key = getRandomBigIntInRange(min, max);
    return key.toString(16)
}

const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const splitRange = (start, end, numCpus) => {
    const startBigInt = BigInt(start);
    const endBigInt = BigInt(end);

    // Calculate the total range
    const totalRange = endBigInt - startBigInt;

    // Calculate the range per CPU
    const rangePerCpu = totalRange / BigInt(numCpus);

    // Generate the sub-ranges
    const subRanges = [];

    for (let i = 0; i < numCpus; i++) {
        const subRangeStart = startBigInt + rangePerCpu * BigInt(i);
        let subRangeEnd;
        if (i === numCpus - 1) { // Last range goes to the end
            subRangeEnd = endBigInt;
        } else {
            subRangeEnd = subRangeStart + rangePerCpu - BigInt(1);
        }
        subRanges.push([subRangeStart.toString(16), subRangeEnd.toString(16)]); // Convert to hexadecimal
    }

    return subRanges;
}

module.exports = {
    getRandomBigIntInRange,
    generateRandomPrivateKey,
    delay,
    splitRange,
    fromPrivateKey
}

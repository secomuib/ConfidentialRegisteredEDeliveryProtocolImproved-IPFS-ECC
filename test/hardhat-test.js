const assert = require('assert');
let chai = require("chai");

const expect = require('chai').expect;
const { ethers } = require("hardhat");


const EC = require('elliptic').ec;
const elliptic = require('elliptic');
const bigInt = require("big-integer");

var xor = require('buffer-xor');

/*const compiledFactoryPath = '../src/ethereum/build/ConfidentialMultipartyRegisteredEDeliveryWithoutTTPFactory.json';
const compiledDeliveryPath = '../src/ethereum/build/ConfidentialMultipartyRegisteredEDeliveryWithoutTTP.json';
const compiledFactory = require(compiledFactoryPath);
const compiledDelivery = require(compiledDeliveryPath);*/

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('ipfs.infura.io', '5001', { protocol: 'https' })

describe('ConfidentialMultipartyRegisteredEDeliveryWithoutTTP', () => {
    let factoryContract;
    let deliveryContract;
    let deliveryContractAddress;
    let accounts;

    //Variables definition
    let keySender, keyReceiver, G, Gx, Gy, N, messageSent, C, V, Vx, Vy, ipfsDoc;
    let v, c, s, A, a, B, b, Z1, Z1encode, Z2;
    let r;
    let owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10;


    const MESSAGE = "Hola, com va tot?"
    //console.log(MESSAGE)

    beforeEach(async () => {
        // VARIABLES FOR CREATE()
        //Create and initialize EC context
        const ec = new EC('secp256k1');

        //Generation of G and N
        G = ec.g;
        Gx = ec.g.x;
        Gy = ec.g.y;
        N = ec.n;
        NBig = bigInt((ec.n).toString('hex'), 16)

        //Generate keys (A, a)
        keySender = ec.genKeyPair();
        A = keySender.getPublic();
        a = keySender.getPrivate('hex');

        //Generate random number v
        v = elliptic.rand(32);
        const vBig = bigInt(v.toString('hex'), 16)
        //console.log('vBig', vBig)

        //Message
        messageSent = Buffer.from(MESSAGE, 'utf8');
        messageSent = bigInt(messageSent.toString('hex'), 16);
        //console.log(vBig)
        //console.log(messageSent);
        //Encryption
        C = vBig.xor(messageSent);
        C = Buffer.from(C.toString(), 'utf8')
        console.log('C', C)
        //Upload C to IPFS
        ipfsDoc = await ipfs.add(C);
        //console.log(ipfsDoc[0].path)

        //V (Vx, Vy) generation
        V = G.mul(v);
        Vx = V.getX();
        Vy = V.getY();

        // VARIABLES FOR ACCEPT()
        //Generate keys (B, b)
        keyReceiver = ec.genKeyPair();
        B = keyReceiver.getPublic();
        b = keyReceiver.getPrivate('hex');
        const bBig = bigInt(b, 16);

        //Generate random number s
        s = elliptic.rand(32);

        //Generate random number c (challenge)
        c = elliptic.rand(32);
        const cBig = bigInt(c.toString('hex'), 16);

        //Generation of Z1 = Gx[s]
        Z1 = G.mul(s);
        Z1encode = Z1.encode('hex');
        //Generation of Z2 = Ax[si] XOR bi
        Z2 = A.mul(s);
        Z2 = bigInt(Z2.getX().toString(16), 16)
        Z2 = Z2.xor(bBig);

        // VARIABLES FOR FINISH()
        //Generation of r = v - bi * ci modn
        r = vBig.subtract(bBig.multiply(cBig)).mod(NBig);
        /*console.log('r', r);
        console.log('bBig', bBig);
        console.log('cBig', cBig);
        console.log('NBig', NBig);*/
        
        //DECRYPTION         
        //v = ri + bi*ci modn
        let _v = r.add(bBig.multiply(cBig)).mod(NBig);
        //console.log(_v)
        let CBuff = Buffer.from(C).toString();
        //console.log('CBuff', CBuff)
        let CBig = bigInt(CBuff);
        //console.log('Cbig', CBig);

        //Obtain message: v XOR C
        const m = _v.xor(CBig);
        const message = Buffer.from(m.toString(16), 'hex');
        console.log(message.toString());

        //Contracts deployment
        [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10] = await ethers.getSigners();

        const FactoryContract = await ethers.getContractFactory('ConfidentialMultipartyRegisteredEDeliveryWithoutTTPFactory')
        const DeliveryContract = await ethers.getContractFactory('ConfidentialMultipartyRegisteredEDeliveryWithoutTTP')

        factoryContract = await FactoryContract.deploy();

        await factoryContract.createDelivery([addr1.address/*, addr2.address, addr3.address, addr4.address, addr5.address, addr6.address, addr7.address, addr8.address, addr9.address, addr10.address*/], "0x" + Vx.toString(16), "0x" + Vy.toString(16), ipfsDoc[0].path,
            "0x" + A, 600, 1200, { value: ethers.utils.parseEther('1.0')});

        const addresses = await factoryContract.getDeliveries();

        deliveryContract = DeliveryContract.attach(addresses[0]);
    });

    it("receiver can accept delivery", async function () {
        const formatBigIntToHex = n => {
            // Per assegurar que té una longitud parell (si no, dóna error)
            if (n.toString(16).length % 2 === 0) {
                return `0x${n.toString(16)}`;
            } else {
                return `0x0${n.toString(16)}`;
            }
        };

        await deliveryContract.connect(addr1).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        
        let state = await deliveryContract.connect(addr1).getState(addr1.address);
        assert.equal(state, "accepted");
    });

    it("sender can finish delivery", async function () {
        const formatBigIntToHex = n => {
            // Per assegurar que té una longitud parell (si no, dóna error)
            if (n.toString(16).length % 2 === 0) {
                return `0x${n.toString(16)}`;
            } else {
                return `0x0${n.toString(16)}`;
            }
        };
        await deliveryContract.connect(addr1).accept("0x" + Z1encode, "0x" + Z2.toString(16), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        /*await deliveryContract.connect(addr2).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr3).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr4).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr5).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr6).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr7).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr8).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr9).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));
        await deliveryContract.connect(addr10).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));*/
        
        const rstring = '0x' + r.toString(16).substr(1);
        await deliveryContract.connect(owner).finish(addr1.address, rstring);
    });

    /*it("received message is correct", async function() {
        const formatBigIntToHex = n => {
            // Per assegurar que té una longitud parell (si no, dóna error)
            if (n.toString(16).length % 2 === 0) {
                return `0x${n.toString(16)}`;
            } else {
                return `0x0${n.toString(16)}`;
            }
        }

        await deliveryContract.connect(addr1).accept("0x" + Z1encode, formatBigIntToHex(Z2), formatBigIntToHex(B.getX()), formatBigIntToHex(B.getY()),
            "0x" + c.toString('hex'));

        const rstring = '0x' + r.toString(16).substr(1);
        await deliveryContract.connect(owner).finish(addr1.address, rstring);
        
        let receiversState = await deliveryContract.receiversState(addr1.address);
        c = receiversState.c;

        let cBig = bigInt(c, 16);
        let bBig = bigInt(b,16);

        let _hashIPFS = await deliveryContract.hashIPFS();
        let _C = await ipfs.get(_hashIPFS);
        _C = _C[0].content

        //C = bigInt(Buffer.from(C).toString())
        console.log('_C', _C)

        //console.log('r', r);
        //console.log('bBig', bBig);
        //console.log('cBig', cBig);
        //console.log('NBig', NBig);
        //DECRYPTION         
        //v = ri + bi*ci modn
        let __v = r.add(bBig.multiply(cBig)).mod(NBig);
        console.log('v', __v)
        let CBuff = Buffer.from(C).toString();
        console.log('CBuff', CBuff)
        let CBig = bigInt(CBuff);
        console.log('Cbig', CBig);

        //Obtain message: v XOR C
        const m = __v.xor(CBig);
        message = Buffer.from(m.toString(16), 'hex');
        console.log(message.toString());
    });*/

});

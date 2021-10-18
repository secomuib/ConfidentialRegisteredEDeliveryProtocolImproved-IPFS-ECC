const assert = require('assert');

const EC = require('elliptic').ec;
const elliptic = require ('elliptic');
const bigInt = require("big-integer");

var xor = require('buffer-xor');

/*const formatBigIntToHex = n => {
  // Per assegurar que té una longitud parell (si no, dóna error)
  if (n.toString(16).length % 2 === 0) {
    return `0x${n.toString(16)}`;
  } else {
    return `0x0${n.toString(16)}`;
  }
};*/

// Convert a hex string to a byte array
/*function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
  bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes) {
  for (var hex = [], i = 0; i < bytes.length; i++) {
      var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      hex.push((current >>> 4).toString(16));
      hex.push((current & 0xF).toString(16));
  }
  return hex.join("");
}*/

//Create and initialize EC context
const ec = new EC('secp256k1');


//Generate keys
const keySender = ec.genKeyPair();
const a = keySender.getPrivate('hex');
console.log(a);
const aBig = bigInt(a, 16)

const A = keySender.getPublic();
console.log('A', A)

const Ax = keySender.getPublic().getX().toString(16);
console.log('Ax', Ax)
const Ay = keySender.getPublic().getY();

const keyReceiver = ec.genKeyPair();
const b = keyReceiver.getPrivate('hex');
console.log(b)
const bBig = bigInt(b,16)
console.log('b', b);
console.log('bBig', bBig);
console.log('bBig hex', bBig.toString(16))
const B = keyReceiver.getPublic('hex');
const Bx = keyReceiver.getPublic().getX();
const By = keyReceiver.getPublic().getY();

let G = ec.g;
let Gx = ec.g.x;
const Gy = ec.g.y;
const N = ec.n;

//Definim missatge
const message = 'Hola, bon dia!'
const messageSentBuffer = Buffer.from(message, 'utf8');
console.log(`Message: 0x${messageSentBuffer.toString('hex')}`);
console.log(messageSentBuffer)
const messageSentHex = messageSentBuffer.toString('hex');
console.log(messageSentHex);

//ALICE
//1. Generam v 
let v = elliptic.rand(32);
console.log('v:', v);

const vHex = v.toString('hex');
console.log('vHex: ', vHex);

//2. Calcula Vx, Vy --> vxG
const V = G.mul(v);
const Vx = V.getX();
const Vy = V.getY();


//3. Xifra m
const C = xor(v, messageSentBuffer);
console.log('C:', C);
console.log(C.toString('hex'))

//BOB
//1. Genera s
const s = elliptic.rand(32);
console.log('s', s)
const sHex = s.toString('hex');
console.log('sHex', sHex)

//2. Calcula Z1, Z2:
//let Z1 = G.mul(s).getX();
let Z1 = G.mul(s);
console.log('Z1', Z1);


let Z1encode = Z1.encode('hex');
console.log('Z1encode', Z1encode);
var curve = elliptic.curves.secp256k1.curve;
/*var prova = new elliptic.curve.short({
  p: '1d',
  a: '4',
  b: '14',
})*/
let provaDecode = curve.decodePoint(Z1encode, 'hex')
console.log('provaDecode', provaDecode);

let Z1Big = bigInt(provaDecode.getX().toString(16), 16);
console.log('Z1', Z1);
console.log('Z1Big', Z1Big);


const Z2 = A.mul(s);
console.log('Z2: ', Z2);
const Z2Big = bigInt(Z2.getX().toString(16),16)
console.log('Z2Big', Z2Big)
const xorZ2 = Z2Big.xor(bBig)
console.log('xorZ2', xorZ2)

//3. Genera c
const c = elliptic.rand(32);
console.log(c);
//ALICE 
//1. Desxifratge bi
const b1 = provaDecode.mul(a)
console.log('b1', b1.getX().toString(16))
const b1Big = bigInt(b1.getX().toString(16),16);
console.log('b1:', b1Big);

const bi = xorZ2.xor(b1Big);
console.log('bi', bi);
console.log('bi hex', bi.toString(16))

//Calcula r
console.log('v', v);
console.log('vHex', vHex)
const vBig = bigInt(vHex, 16);
console.log('vBig', vBig);

const biHex = bi.toString(16);
console.log('biHex', biHex)
const biBig = bigInt(biHex, 16);
console.log('biBig', biBig);

const cHex = c.toString('hex');
const cBig = bigInt(cHex, 16);
console.log('cBig', cBig);

console.log('N', N)

const NBig = bigInt(N, 16)

let r = vBig.subtract(biBig.multiply(cBig)).mod(NBig);
console.log('r', r);
const formatBigIntToHex = n => {
  // Per assegurar que té una longitud parell (si no, dóna error)
  if (n.toString(16).length % 2 === 0) {
    return `0x${n.toString(16)}`;
  } else {
    return `0x0${n.toString(16)}`;
  }
};
console.log('rhex', formatBigIntToHex(r))

//BOB
//1. Calcula
//const bHex = b.toString('hex');
//console.log('bHex', bHex)
//const bBig = bigInt(bHex, 16);
//console.log('bBig', bBig);
const vBob = r.add(bBig.multiply(cBig)).mod(NBig);
console.log('vBob', vBob);
//2. Desxifra 
const stringv = vBob.toString(16);
console.log('stringv: ',stringv)
const vBuffer = Buffer.from(stringv, 'hex');

console.log('vBuffer', vBuffer, 'c', C);
const mBob = xor(vBuffer, C);
console.log(mBob.toString());

//prova desxifram C
//const provaDesxifratge = xor(v, C);
//console.log(provaDesxifratge.toString());
/*console.log('public',keySender.getPublic())
const x = keySender.getPublic().getX().toString("hex");
console.log('x', x)

const y = keySender.getPublic().getY().toString("hex");
console.log('y', y)
const provaPublic = ec.keyFromPublic({x,y})
console.log(provaPublic.getPublic())*/

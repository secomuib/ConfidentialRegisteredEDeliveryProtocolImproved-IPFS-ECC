import bigInt from 'big-integer';

const EC = require ('elliptic').ec;
const elliptic = require ('elliptic');

//Create and initialize EC context
const ec = new EC('secp256k1');

//Generate keys
let a ="ae61751418647e9a8562bc272903ecdcb4bf31da19242d4e1163a9a8acc41af8";
let A = "04583d16265551f1f2ef5716dff302fa96e5e337ea87ca35d10d7b1c208b98ba7ea517781a35547fefad9a3ab0f3f725c91c3abcbab17ab4071057a8a543bfa044";
console.log('a')
console.log(a);
console.log(A);

let b = "5a8f75926cdbf4d45baa120b3fb57950f63ff0daab64609036260367bc6441dc";
let B = "04f2281c345b678735ba943456818fa08ae4a0bb4c8969d97d5047cb79a23ec1426582005e9aed4659c722248143d752be52936cf88fe2d4908a2680562205ae0c";
console.log(b);
console.log(B);

//Passam A i B a l'objecte Key
var curve = elliptic.curves.secp256k1.curve;
A = curve.decodePoint(A, 'hex');
console.log('A', A);
B = curve.decodePoint(B, 'hex');
console.log('B', B);

let vhex = "b97199d608cdc1362db9d22867be00d0b75feda82a8681b630cdf23264ec52b1"
console.log('vBig', bigInt(vhex,16))

let v = Buffer.from(vhex);
console.log('v length', (v.length)*4);


const Gx = ec.g.x;
const Gy = ec.g.y;
const N = ec.n;
console.log('N', N);

export default {
  a  : a ,
  A  : A,
  b : b,
  B : B,
  v : v,
  vhex: vhex,
  Gx : Gx,
  Gy : Gy, 
  N : N
}


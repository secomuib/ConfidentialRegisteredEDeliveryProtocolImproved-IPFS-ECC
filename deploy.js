const path = require("path");
const fs = require("fs-extra"); // fs with extra functions
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');

const compiledFactoryPath = './src/ethereum/build/ConfidentialMultipartyRegisteredEDeliveryWithoutTTPFactory.json';
const compiledFactory = require(compiledFactoryPath);

const provider = new HDWalletProvider(
  'margin replace dance powder sponsor point dignity gallery board army shed install',
  'https://rinkeby.infura.io/v3/6c6c7356844a424e9c277e665ac7e109'
);
const web3 = new Web3(provider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log('Attempting to deploy from account', accounts[0]);

  const result = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
    .deploy({ data: compiledFactory.bytecode, arguments: [] })
    .send({ from: accounts[0], gas: '8000000' });

  //fs.writeFileSync('./CONTRACTADDRESS', result.options.address);
  compiledFactory.address = result.options.address;

  fs.outputJsonSync(
    path.resolve(__dirname, compiledFactoryPath),
    compiledFactory,
    {spaces: 2} // Indent json output with 2 spaces
  );

  console.log('Contract deployed to Rinkeby network, at address ', result.options.address);
};
deploy();

import web3 from './web3';

//const path = require("path");
//const fs = require("fs-extra"); // fs with extra functions

const DeliveryFactory = require('./build/ConfidentialMultipartyRegisteredEDeliveryWithoutTTPFactory.json');

const instance = new web3.eth.Contract(
    DeliveryFactory.abi,
    DeliveryFactory.address
);

export default instance;
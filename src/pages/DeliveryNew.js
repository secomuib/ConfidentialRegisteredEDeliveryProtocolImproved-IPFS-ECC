import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input } from 'semantic-ui-react';
import factory from '../ethereum/factory';
import web3 from '../ethereum/web3';
import variables from '../ethereum/variables';
import ipfs from '../ipfs.js'

const EC = require ('elliptic').ec;
const elliptic = require ('elliptic');

const bigInt = require("big-integer");
const ec = new EC('secp256k1');

var xor = require('buffer-xor');



class DeliveryNew extends Component {
  state = {
    receiver: '',
    message: '',
    term1: '',
    term2: '',
    deposit: '',
    loading: false,
    errorMessage: ''
  };

  onSubmit = async event => {
    event.preventDefault();

    this.setState({ loading: true, errorMessage: '' });

    try {
        let ipfsDoc;
        
        // A, Ay, Gx, Gy and N of ECC algorithm
        let A = variables.A.encode('hex');
        let Gx = variables.Gx;
        console.log('Gx', "0x"+Gx.toString(16))
        let Gy = variables.Gy;
        console.log('Gy', "0x"+Gy.toString(16))
        let N = variables.N;
        console.log('N', "0x"+N.toString(16))
        
        //v and V generation
        const v = variables.vhex;
        const V = ec.g.mul(v);
        const Vx = V.getX();
        const Vy = V.getY();
        
        //Encryption of message
        let messageSentBuffer = Buffer.from(this.state.message, 'utf8');
        let messageSent = bigInt(messageSentBuffer.toString('hex'), 16);
        let vBig = bigInt(v, 16)

        const C = vBig.xor(messageSent);
        

        //Upload C to IPFS
        ipfsDoc = await ipfs.add(C.toString());
        
        const accounts = await web3.eth.getAccounts();
        await factory.methods.createDelivery([this.state.receiver], "0x"+Vx.toString(16), "0x"+Vy.toString(16), ipfsDoc.cid.toString(),
          "0x"+A, this.state.term1, this.state.term2).send({ from: accounts[0], value: this.state.deposit });

        alert('Delivery created!');
        // Refresh, using withRouter
        this.props.history.push('/');
    } catch (err) {
        this.setState({ errorMessage: err.message });
    } finally {
        this.setState({ loading: false });
    }

  };

  render() {
    return (
      <div>
        <Link to='/'>Back</Link>
        <h3>Send New Delivery</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage}>
          <Form.Field>
            <label>Receiver</label>
            <Input
              value={this.state.receiver}
              onChange={event => this.setState({ receiver: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Message</label>
            <Input
              value={this.state.message}
              onChange={event => this.setState({ message: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Term 1</label>
            <Input
              label="seconds"
              labelPosition="right"
              value={this.state.term1}
              onChange={event => this.setState({ term1: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Term 2</label>
            <Input
              label="seconds"
              labelPosition="right"
              value={this.state.term2}
              onChange={event => this.setState({ term2: event.target.value })}
            />
          </Form.Field>

          <Form.Field>
            <label>Deposit</label>
            <Input
              label="wei"
              labelPosition="right"
              value={this.state.deposit}
              onChange={event => this.setState({ deposit: event.target.value })}
            />
          </Form.Field>

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading}>
            Send!
          </Button>
        </Form>
      </div>
    );
  }
}

export default withRouter(DeliveryNew);

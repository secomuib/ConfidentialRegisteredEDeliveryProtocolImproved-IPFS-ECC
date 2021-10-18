import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader, Label } from 'semantic-ui-react';
import notification from '../ethereum/notification';
import web3 from '../ethereum/web3';
import variables from '../ethereum/variables';

const EC = require ('elliptic').ec;
const elliptic = require ('elliptic');

//Create and initialize EC context
const ec = new EC('secp256k1');

var xor = require('buffer-xor');

const bigInt = require("big-integer");
const dateFormat = require('dateformat');

class DeliveryShow extends Component {
  state = {
    address: '',
    sender: '',
    receiver: '',
    state: '',
    g: '',
    p: '',
    hashIPFS: '',
    c1: '',
    c2: '',
    ya: '',
    term1: '',
    term2: '',
    start: '',
    z1: '',
    z2: '',
    yb: '',
    c: '',
    w: '',
    message: '',
    deposit: '',
    loading: false,
    errorMessage: ''
  };

  componentDidMount = async () => {

    this.setState({ loading: true, errorMessage: '' });

    try {
      let address = this.props.match.params.address;
      let deliveryContract = notification(address);

      let deposit = await web3.eth.getBalance(address)

      let sender = await deliveryContract.methods.sender().call();
      let receiver = await deliveryContract.methods.receivers(0).call();
      let state = await deliveryContract.methods.getState(receiver).call();
      let gx = await deliveryContract.methods.gx().call();
      let gy = await deliveryContract.methods.gy().call();
      let n = await deliveryContract.methods.n().call();
      let hashIPFS = await deliveryContract.methods.hashIPFS().call();
      
      //Obtain C from IPFS
      const response = await fetch('https://ipfs.infura.io:5001/api/v0/cat?arg='+hashIPFS);
      let C = await response.text();

      let A = await deliveryContract.methods.A().call();
      let term1 = await deliveryContract.methods.term1().call();
      let term2 = await deliveryContract.methods.term2().call();
      let start = await deliveryContract.methods.start().call();

      let receiversState = await deliveryContract.methods.receiversState(receiver).call();

      let z1 = receiversState.z1;
      let z2 = receiversState.z2;
      let bx = receiversState.bx;
      let by = receiversState.by;
      let c = receiversState.c;
      let r = receiversState.r;
      let message = '';

      let d = new Date(0);
      d.setUTCSeconds(start);
      start = dateFormat(d, "dd/mm/yyyy HH:MM");

      // Calcular MESSAGE
      if (r) {
        /*
        const vBob = r.add(bBig.multiply(cBig)).mod(NBig);
        console.log('vBob', vBob);
        //2. Desxifra 
        const stringv = vBob.toString(16);
        console.log('stringv: ',stringv)
        const vBuffer = Buffer.from(stringv, 'hex');

        console.log('vBuffer', vBuffer, 'c', C);
        const mBob = xor(vBuffer, C);
        console.log(mBob.toString());*/
        const formatBigIntToHex = n => {
          // Per assegurar que té una longitud parell (si no, dóna error)
          if (n.toString(16).length % 2 === 0) {
            return `0x${n.toString(16)}`;
          } else {
            return `0x0${n.toString(16)}`;
          }
        };

        console.log('rhex', r.toString('hex'));
        let rBig = bigInt('-'+r)
        console.log('rhex', formatBigIntToHex(r, 16));

        let bBig = bigInt(variables.b, 16)
        let cBig = bigInt(c)
        //Obtenim n de 'secp256k1' i ho passam a bigInt
        const NBig = bigInt((ec.n).toString('hex'), 16)
        console.log('rBig', rBig)
        console.log('bBig', bBig)
        console.log('cBig', cBig)
        console.log('NBig', NBig)

        let v = rBig.add(bBig.multiply(cBig)).mod(NBig);
        console.log(v);

        console.log('C', C)
        C = bigInt(C);

        const mBob = v.xor(C);
        console.log('mbob', mBob);
        message = Buffer.from(mBob.toString(16), 'hex');
        console.log('prova', message.toString())
      }

      this.setState({ 
        address: address,
        sender: sender,
        receiver: receiver,
        state: state,
        gx: gx,
        gy: gy,
        hashIPFS: hashIPFS,
        C: C,
        A: A,
        term1: term1,
        term2: term2,
        start: start,
        z1: z1,
        z2: z2,
        bx: bx,
        by: by,
        c: c,
        r: r,
        message: message,
        deposit: deposit
      });
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  onSubmit = async event => {
    event.preventDefault();

    // Refresh, using withRouter
    this.props.history.push('/');
  };

  render() {
    return (
      <div>
        <Dimmer inverted active={this.state.loading}>
          <Loader inverted content='Loading...'></Loader>
        </Dimmer>
        <Link to='/'>Back</Link>
        <h3>Show Delivery</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage} hidden={this.state.loading}>
          <Form.Field>
            <label>Address of Smart Contract</label>
            <Input
              readOnly
              value={this.state.address}
            />
          </Form.Field>

          <Form.Field>
            <label>Sender</label>
            <Input
              readOnly
              value={this.state.sender}
            />
          </Form.Field>

          <Form.Field>
            <label>Receiver</label>
            <Input
              readOnly
              value={this.state.receiver}
            />
          </Form.Field>

          <Form.Field>
            <label>State</label>
            {
              this.state.state==='finished'? 
              (
              < Label as='a' color='teal' horizontal>Finished</Label>
              ) : (
                this.state.state==='accepted'? (
                  <Label as='a' color='yellow' horizontal>Accepted</Label>
                ) : (
                  this.state.state==='created'? (
                    <Label as='a' horizontal>Created</Label>
                  ) : (
                    <Label as='a' horizontal>-</Label>
                  )
                )
              )
            }
          </Form.Field>

          <Form.Field>
            <label>Gx of ECC algorithm</label>
            <Input
              readOnly
              value={this.state.gx}
            />
          </Form.Field>

          <Form.Field>
            <label>Gy of ECC algorithm</label>
            <Input
              readOnly
              value={this.state.gy}
            />
          </Form.Field>

          <Form.Field>
            <label>Hash IPFS of the encrypted message</label>
            <Input
              readOnly
              value={this.state.hashIPFS}
            />
          </Form.Field>

          <Form.Field>
            <label>Ciphertext</label>
            <Input
              readOnly
              value={this.state.C}
            />
          </Form.Field>

          <Form.Field>
            <label>Public key of A</label>
            <Input
              readOnly
              value={this.state.A}
            />
          </Form.Field>

          <Form.Field>
            <label>Term 1</label>
            <Input
              readOnly
              label="seconds"
              labelPosition="right"
              value={this.state.term1}
            />
          </Form.Field>

          <Form.Field>
            <label>Term 2</label>
            <Input
              readOnly
              label="seconds"
              labelPosition="right"
              value={this.state.term2}
            />
          </Form.Field>

          <Form.Field>
            <label>Start (Timestamp)</label>
            <Input
              readOnly
              value={this.state.start}
            />
          </Form.Field>

          <Form.Field>
            <label>z1 = g^s mod p</label>
            <Input
              readOnly
              value={this.state.z1}
            />
          </Form.Field>

          <Form.Field>
            <label>z2 = xb·ya^s mod p</label>
            <Input
              readOnly
              value={this.state.z2}
            />
          </Form.Field>

          <Form.Field>
            <label>Public Key of B, coordenate x</label>
            <Input
              readOnly
              value={this.state.bx}
            />
          </Form.Field>

           <Form.Field>
            <label>Public Key of B, coordenate y</label>
            <Input
              readOnly
              value={this.state.by}
            />
          </Form.Field>

          <Form.Field>
            <label>c (challenge number)</label>
            <Input
              readOnly
              value={this.state.c}
            />
          </Form.Field>

          <Form.Field>
            <label>r = (v.subtract(bi).multiply(c)).mod(n)</label>
            <Input
              readOnly
              value={this.state.r}
            />
          </Form.Field>

          <Form.Field>
            <label>Message</label>
            <Input
              readOnly
              value={this.state.message}
            />
          </Form.Field>

          <Form.Field>
            <label>Deposit</label>
            <Input
              label="wei"
              labelPosition="right"
              value={this.state.deposit}
            />
          </Form.Field>

          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading}>
            Close
          </Button>
        </Form>
      </div>
    );
  }
}

export default withRouter(DeliveryShow);

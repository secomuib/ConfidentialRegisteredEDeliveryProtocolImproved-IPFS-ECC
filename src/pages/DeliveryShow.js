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
    gx: '',
    gy: '',
    hashIPFS: '',
    C: '',
    A: '',
    term1: '',
    term2: '',
    start: '',
    z1: '',
    z2: '',
    bx: '',
    by: '',
    c: '',
    r: '',
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
      let gx = await deliveryContract.methods.GX().call();
      let gy = await deliveryContract.methods.GY().call();
      let n = variables.N;
      console.log('n', n);
      let hashIPFS = await deliveryContract.methods.hashIPFS().call();
      
      //Obtain C from IPFS
      const response = await fetch('https://ipfs.io/ipfs/'+hashIPFS);
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
      console.log(r)
      // Calcular MESSAGE
      if (r!=0) {
    
        //r, b,c, C and n to bigInt
        let rBig = bigInt('-'+r)
        let bBig = bigInt(variables.b, 16)
        let cBig = bigInt(c)
        let CBig = bigInt(C);
        const NBig = bigInt((n.toString(16)),16)
        
        //v = ri + bi*ci modn
        let v = rBig.add(bBig.multiply(cBig)).mod(NBig);

        //Obtain message: v XOR C
        const m = v.xor(CBig);
        message = Buffer.from(m.toString(16), 'hex');
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
            <label>Z1 = Gx[si]</label>
            <Input
              readOnly
              value={this.state.z1}
            />
          </Form.Field>

          <Form.Field>
            <label>Z2 = Ax[si] XOR bi</label>
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

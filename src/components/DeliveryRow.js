import React, { Component } from 'react';
import { Link } from "react-router-dom";
import { Table, Button, Icon, Message, Label } from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import notification from '../ethereum/notification';
import variables from '../ethereum/variables';
import { format } from 'util';

const bigInt = require("big-integer");
const dateFormat = require('dateformat');

const EC = require ('elliptic').ec;
const elliptic = require ('elliptic');

//Create and initialize EC context
const ec = new EC('secp256k1');

class DeliveryRow extends Component {
  state = {
    receiver: '',
    start: '',
    state: '',
    loading: false,
    errorMessage: '',
  };

  componentDidMount = async () => {
    let deliveryContract = notification(this.props.delivery);
    let receiver = await deliveryContract.methods.receivers(0).call();
    let start = await deliveryContract.methods.start().call();
    let state = await deliveryContract.methods.getState(receiver).call();

    let d = new Date(0);
    d.setUTCSeconds(start);
    start = dateFormat(d, "dd/mm/yyyy HH:MM");

    this.setState({ 
      receiver: receiver,
      start: start,
      state: state
    });
  }

  onView = async () => {
  
  };

  onAccept = async (contractAddress) => {
    let c, s, Z1, Z2;

    this.setState({ loading: true, errorMessage: '' });

    try {
      let deliveryContract = notification(contractAddress);

      const accounts = await web3.eth.getAccounts();

      const formatBigIntToHex = n => {
        // Per assegurar que té una longitud parell (si no, dóna error)
        if (n.toString(16).length % 2 === 0) {
          return `0x${n.toString(16)}`;
        } else {
          return `0x0${n.toString(16)}`;
        }
      };

      let B = variables.B;
      let b = variables.b;

      //let hashIPFS = await deliveryContract.methods.hashIPFS().call();
      let A = (await deliveryContract.methods.A().call()).substr(2);
      
      // A descerialization
      var curve = elliptic.curves.secp256k1.curve;
      A = curve.decodePoint(A, 'hex');

      // s generation: 
      s = elliptic.rand(32)

      // Z1 = Gx[si];
      Z1 = ec.g.mul(s);
      console.log('Z1', Z1);
      // Z2 = (Ax[si]) XOR (bi)
      Z2 = A.mul(s);

      //Z2 to bigInt 
      Z2 = bigInt(Z2.getX().toString(16),16)

      //b to bigInt
      b = bigInt(b, 16)

      //XOR Z2 and b
      Z2 = Z2.xor(b)

      // Challenge generation: 
      c = elliptic.rand(32);

      // Z1 serialization:
      Z1 = Z1.encode('hex');

      // challenge to hexadecimal:
      c = Buffer.from(c).toString("hex");
      

      // x and y coordenates of B (receiver public key)
      const receiverPublicKeyX = B.getX();
      const receiverPublicKeyY = B.getY();

      // Smart contract execution function accept()
      await deliveryContract.methods.accept("0x"+Z1, "0x"+Z2.toString(16), formatBigIntToHex(receiverPublicKeyX), formatBigIntToHex(receiverPublicKeyY), 
      "0x"+c).send({from: accounts[0]});
     

      // Refresh
      alert('Delivery accepted!');
      this.setState({ state: 'accepted' });
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
        this.setState({ loading: false });
    }
  };

  onFinish = async (contractAddress) => {

    this.setState({ loading: true, errorMessage: '' });

    try {
      let deliveryContract = notification(contractAddress);

      const accounts = await web3.eth.getAccounts();

      let a = variables.a;
      console.log('a', a);

      // Z1, Z2, N and c (challenge)
      let receiver = await deliveryContract.methods.receivers(0).call();
      let Z1 = ((await deliveryContract.methods.receiversState(receiver).call()).z1).substr(2);
      let Z2 = ((await deliveryContract.methods.receiversState(receiver).call()).z2).substr(2);
      let c = (await deliveryContract.methods.receiversState(receiver).call()).c;
      
      //Z2 --> bigInt
      Z2 = bigInt(Z2, 16);
      console.log(typeof(c));

      //Deserialization Z1, Z2
      var curve = elliptic.curves.secp256k1.curve;
      Z1 = curve.decodePoint(Z1, 'hex');
      console.log('Z1', Z1);

      //c to bigInt
      c = bigInt(c);
      console.log('c', c)

      //Decipher b = Z_i2 XOR (Z_i1 x [a])
      const b1 = Z1.mul(a)
      const b1Big = bigInt(b1.getX().toString(16),16);
      

      const bi = Z2.xor(b1Big);

      //n to bigInt
      const NBig = bigInt((ec.n).toString('hex'), 16)
      
      //v to bigInt
      let v = variables.vhex;
      let vBig = bigInt(v, 16);

      //r = v-b*c mod(n)
      const r = vBig.subtract(bi.multiply(c)).mod(NBig);
      
      await deliveryContract.methods
        .finish(receiver, '0x'+r.toString(16).substr(1))
        .send({ from: accounts[0] });
      
      // Refresh
      alert('Delivery finished!');
      this.setState({ state: 'finished' });
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
        this.setState({ loading: false });
    }
  };

  render() {
      return (
          <Table.Row>
              <Table.Cell>{this.props.id+1}</Table.Cell>
              <Table.Cell>{this.props.delivery}</Table.Cell>
              <Table.Cell>{this.state.receiver}</Table.Cell>
              <Table.Cell>{this.state.start}</Table.Cell>
              <Table.Cell>
                {
                 this.state.state==='finished'? 
                   (
                    <Label as='a' color='teal' horizontal>Finished</Label>
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
              </Table.Cell>
              <Table.Cell>
                  {
                    this.props.sent ? (
                      <Button animated='vertical' color='blue' onClick={() => this.onFinish(this.props.delivery)} disabled={this.state.state!=='accepted'} loading={this.state.loading}>
                        <Button.Content hidden>Finish</Button.Content>
                        <Button.Content visible>
                          <Icon name='send' />
                        </Button.Content>
                      </Button>
                    ) : (
                      <Button animated='vertical' color='blue' onClick={() => this.onAccept(this.props.delivery)} disabled={this.state.state!=='created'} loading={this.state.loading}>
                        <Button.Content hidden>Accept</Button.Content>
                        <Button.Content visible>
                          <Icon name='check' />
                        </Button.Content>
                    </Button>
                    )
                  }
                  <Link to={"/deliveries/"+this.props.delivery}>
                    <Button animated='vertical' color='blue' onClick={this.onView}>
                      <Button.Content hidden>View</Button.Content>
                      <Button.Content visible>
                        <Icon name='eye' />
                      </Button.Content>
                    </Button>
                  </Link>
                  <Message error header="ERROR" content={this.state.errorMessage} hidden={!this.state.errorMessage} />
              </Table.Cell>
          </Table.Row>
          
      );
    }
}

export default DeliveryRow;

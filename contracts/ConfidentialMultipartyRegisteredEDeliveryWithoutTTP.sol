pragma solidity ^0.5.3;

import {EllipticCurve} from "./EllipticCurve.sol";

// Factory contract for Confidential Multiparty Registered eDelivery
contract ConfidentialMultipartyRegisteredEDeliveryWithoutTTPFactory {
    mapping(address => address[]) public senderDeliveries;
    mapping(address => address[]) public receiverDeliveries;
    address[] public deliveries;

    function createDelivery(address[] memory _receivers, uint256 _vx, uint256 _vy, string memory _hashIPFS, string memory _A, uint256 _term1, uint256 _term2) public payable {
        address newDelivery = address ((new ConfidentialMultipartyRegisteredEDeliveryWithoutTTP)
            .value(msg.value)(msg.sender, _receivers, _vx, _vy, _hashIPFS, _A, _term1, _term2));
        deliveries.push(newDelivery);
        senderDeliveries[msg.sender].push(newDelivery);
        for (uint256 i = 0; i<_receivers.length; i++) {
            receiverDeliveries[_receivers[i]].push(newDelivery);
        }
    }

    function getSenderDeliveries(address _sender) public view returns (address[] memory) {
        return senderDeliveries[_sender];
    }

    function getSenderDeliveriesCount(address _sender) public view returns (uint) {
        return senderDeliveries[_sender].length;
    }

    function getReceiverDeliveries(address _receiver) public view returns (address[] memory) {
        return receiverDeliveries[_receiver];
    }

    function getReceiverDeliveriesCount(address _receiver) public view returns (uint) {
        return receiverDeliveries[_receiver].length;
    }

    function getDeliveries() public view returns (address[] memory) {
        return deliveries;
    }

    function getDeliveriesCount() public view returns (uint) {
        return deliveries.length;
    }
}

// Confidential Multiparty Registered eDelivery
contract ConfidentialMultipartyRegisteredEDeliveryWithoutTTP {

    using EllipticCurve for uint256;

    // Possible states
    enum State {notexists, created, cancelled, accepted, finished, rejected }

    struct ReceiverState{
        string z1;
        bytes z2;
        uint256 bx;
        uint256 by;
        uint256 c;
        uint256 r;
        State state;
    }
    // Parties involved
    address public sender;
    address[] public receivers;
    mapping (address => ReceiverState) public receiversState;
    uint acceptedReceivers;

    // Message
    uint256 public vx;
    uint256 public vy;
    string public hashIPFS;
    string public A;
    // Base point
    uint256 public constant GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 public constant GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    uint256 public constant AA = 0;
    uint256 public constant BB = 7;
    uint256 public constant PP = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    uint256 public constant a = 0;
    
    // Time limit (in seconds)
    // See units: http://solidity.readthedocs.io/en/develop/units-and-global-variables.html?highlight=timestamp#time-units
    uint public term1;
    uint public term2;
    // Start time
    uint public start;

    // Constructor funcion to create the delivery
    constructor (address _sender, address[] memory _receivers, uint256 _vx, uint256 _vy, string memory _hashIPFS, string memory _A, uint _term1, uint _term2) public payable {
        // Requires that the sender send a deposit of minimum 1 wei (>0 wei)
        require(msg.value>0, "Sender has to send a deposit of minimun 1 wei");
        require(_term1 < _term2, "Timeout term2 must be greater than _term1");
        sender = _sender;
        receivers = _receivers;
        // We set the state of every receiver to 'created'
        for (uint i = 0; i<receivers.length; i++) {
            receiversState[receivers[i]].state = State.created;
        }
        acceptedReceivers = 0;
        vx = _vx;
        vy = _vy;
        hashIPFS = _hashIPFS;
        A = _A;
        start = now; // now = block.timestamp
        term1 = _term1; // timeout term1, in seconds
        term2 = _term2; // timeout term2, in seconds
    }

    // accept() lets receivers accept the delivery
    function accept(string memory _z1, bytes memory _z2, uint256 _bx, uint256 _by, uint256 _c) public {
        require(now < start+term1, "The timeout term1 has been reached");
        require(receiversState[msg.sender].state==State.created, "Only receivers with 'created' state can accept");

        acceptedReceivers = acceptedReceivers + 1;
        receiversState[msg.sender].z1 = _z1;
        receiversState[msg.sender].z2 = _z2;
        receiversState[msg.sender].bx = _bx;
        receiversState[msg.sender].by = _by;
        receiversState[msg.sender].c = _c;
        receiversState[msg.sender].state = State.accepted;
    }

    // finish() lets sender finish the delivery sending the message
    function finish(address _receiver, uint256 _r) public {
        uint256 Grx;
        uint256 Gry;
        uint256 Bcx;
        uint256 Bcy;
        uint256 xAdd;
        uint256 yAdd;
        
        require((now >= start+term1) || (acceptedReceivers>=receivers.length),
            "The timeout term1 has not been reached and not all receivers have been accepted the delivery");
        require (msg.sender==sender, "Only sender of the delivery can finish");

        //Check V == G x [ri] + Bi x [ci]
        (Grx, Gry) = _r.ecMul(GX, GY, AA, PP);
        (Bcx, Bcy) = receiversState[_receiver].c.ecMul(
            receiversState[_receiver].bx,
            receiversState[_receiver].by, 
            AA,
            PP
        );
        (xAdd, yAdd) = Grx.ecAdd(Gry, Bcx, Bcy, AA, PP);
        require(vx!= xAdd, "V and Gx[ri]+Bix[ci] are not equals");
        require(vy != yAdd, "V and Gx[ri]+Bix[ci] are not equals");
        
        msg.sender.transfer(address(this).balance); // Sender receives the refund of the deposit
        // We set the state of every receiver with 'accepted' state to 'finished'
        for (uint i = 0; i<receivers.length; i++) {
            receiversState[receivers[i]].r = _r;

            if (receiversState[receivers[i]].state == State.accepted) {
                receiversState[receivers[i]].state = State.finished;
            } else if (receiversState[receivers[i]].state == State.created) {
                receiversState[receivers[i]].state = State.rejected;
            }
        }
    }
    

    // cancel() lets receivers cancel the delivery
    function cancel() public {
        require(now >= start+term2, "The timeout term2 has not been reached");
        require(receiversState[msg.sender].state==State.accepted, "Only receivers with 'accepted' state can cancel");

        receiversState[msg.sender].state = State.cancelled;
    }

    // getState(address) returns the state of a receiver in an string format
    function getState(address _receiver) public view returns (string memory) {
        if (receiversState[_receiver].state==State.notexists) {
            return "not exists";
        } else if (receiversState[_receiver].state==State.created) {
            return "created";
        } else if (receiversState[_receiver].state==State.cancelled) {
            return "cancelled";
        } else if (receiversState[_receiver].state==State.accepted) {
            return "accepted";
        } else if (receiversState[_receiver].state==State.finished) {
            return "finished";
        } else if (receiversState[_receiver].state==State.rejected) {
            return "rejected";
        }
    }

    // getR(address) returns the W value of a receiver
    function getR(address _receiver) public view returns (uint256) {
        return receiversState[_receiver].r;
    }
    
}
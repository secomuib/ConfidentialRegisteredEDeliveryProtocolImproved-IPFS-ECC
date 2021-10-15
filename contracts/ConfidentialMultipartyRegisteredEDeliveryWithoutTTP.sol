pragma solidity ^0.4.25;

// Factory contract for Confidential Multiparty Registered eDelivery
contract ConfidentialMultipartyRegisteredEDeliveryWithoutTTPFactory {
    mapping(address => address[]) public senderDeliveries;
    mapping(address => address[]) public receiverDeliveries;
    address[] public deliveries;

    function createDelivery(address[] memory _receivers, uint256 _vx, uint256 _vy, string memory _hashIPFS, string _A, uint256 _gx, uint256 _gy, uint256 _n, uint256 _term1, uint256 _term2) public payable {
        address newDelivery = (new ConfidentialMultipartyRegisteredEDeliveryWithoutTTP)
            .value(msg.value)(msg.sender, _receivers, _vx, _vy, _hashIPFS, _A, _gx, _gy, _n, _term1, _term2);
        deliveries.push(newDelivery);
        senderDeliveries[msg.sender].push(newDelivery);
        for (uint256 i = 0; i<_receivers.length; i++) {
            receiverDeliveries[_receivers[i]].push(newDelivery);
        }
    }

    function getSenderDeliveries(address _sender) public view returns (address[]) {
        return senderDeliveries[_sender];
    }

    function getSenderDeliveriesCount(address _sender) public view returns (uint) {
        return senderDeliveries[_sender].length;
    }

    function getReceiverDeliveries(address _receiver) public view returns (address[]) {
        return receiverDeliveries[_receiver];
    }

    function getReceiverDeliveriesCount(address _receiver) public view returns (uint) {
        return receiverDeliveries[_receiver].length;
    }

    function getDeliveries() public view returns (address[]) {
        return deliveries;
    }

    function getDeliveriesCount() public view returns (uint) {
        return deliveries.length;
    }
}

// Confidential Multiparty Registered eDelivery
contract ConfidentialMultipartyRegisteredEDeliveryWithoutTTP {

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
    uint256 public gx;
    uint256 public gy;
    uint256 public n;
    uint256 public constant a = 0;
    
    // Time limit (in seconds)
    // See units: http://solidity.readthedocs.io/en/develop/units-and-global-variables.html?highlight=timestamp#time-units
    uint public term1;
    uint public term2;
    // Start time
    uint public start;

    // Constructor funcion to create the delivery
    constructor (address _sender, address[] memory _receivers, uint256 _vx, uint256 _vy, string memory _hashIPFS, string _A, uint256 _gx, uint256 _gy, uint256 _n, uint _term1, uint _term2) public payable {
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
        gx = _gx;
        gy = _gy;
        n = _n;
        start = now; // now = block.timestamp
        term1 = _term1; // timeout term1, in seconds
        term2 = _term2; // timeout term2, in seconds
    }

    // accept() lets receivers accept the delivery
    function accept(string _z1, bytes _z2, uint256 _bx, uint256 _by, uint256 _c) public {
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
        
        require((now >= start+term1) || (acceptedReceivers>=receivers.length),
            "The timeout term1 has not been reached and not all receivers have been accepted the delivery");
        require (msg.sender==sender, "Only sender of the delivery can finish");

        //Check V == G x [ri] + Bi + [ci]
        (Grx, Gry) = deriveKey(_r, gx, gy);
        (Bcx, Bcy) = deriveKey(
            receiversState[_receiver].c,
            receiversState[_receiver].bx,
            receiversState[_receiver].by
        );
        
        require(vx != Grx + Bcx, "V and Gx[ri]+Bix[ci] are not equals");
        require(vy != Gry + Bcy, "V and Gx[ri]+Bix[ci] are not equals");
        
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
    function getState(address _receiver) public view returns (string) {
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

    // getW(address) returns the W value of a receiver
    function getW(address _receiver) public view returns (uint256) {
        return receiversState[_receiver].r;
    }
    
    function deriveKey(
        uint256 privKey,
        uint256 pubX,
        uint256 pubY
    ) internal view returns (uint256 qx, uint256 qy) {
        uint256 x;
        uint256 y;
        uint256 z;
        (x, y, z) = _ecMul(privKey, pubX, pubY, 1);
        z = _inverse(z);
        qx = mulmod(x, z, n);
        qy = mulmod(y, z, n);
    }

    function _ecMul(
        uint256 d,
        uint256 x1,
        uint256 y1,
        uint256 z1
    )
        internal
        view
        returns (
            uint256 x3,
            uint256 y3,
            uint256 z3
        )
    {
        uint256 remaining = d;
        uint256 px = x1;
        uint256 py = y1;
        uint256 pz = z1;
        uint256 acx = 0;
        uint256 acy = 0;
        uint256 acz = 1;

        if (d == 0) {
            return (0, 0, 1);
        }

        while (remaining != 0) {
            if ((remaining & 1) != 0) {
                (acx, acy, acz) = _ecAdd(acx, acy, acz, px, py, pz);
            }
            remaining = remaining / 2;
            (px, py, pz) = _ecDouble(px, py, pz);
        }

        (x3, y3, z3) = (acx, acy, acz);
    }

    function _inverse(uint256 aa) internal view returns (uint256 invA) {
        uint256 t = 0;
        uint256 newT = 1;
        uint256 r = n;
        uint256 newR = aa;
        uint256 q;
        while (newR != 0) {
            q = r / newR;

            (t, newT) = (newT, addmod(t, (n - mulmod(q, newT, n)), n));
            (r, newR) = (newR, r - q * newR);
        }

        return t;
    }

    function _ecAdd(
        uint256 x1,
        uint256 y1,
        uint256 z1,
        uint256 x2,
        uint256 y2,
        uint256 z2
    )
        internal
        view
        returns (
            uint256 x3,
            uint256 y3,
            uint256 z3
        )
    {
        uint256 l;
        uint256 lz;
        uint256 da;
        uint256 db;

        if ((x1 == 0) && (y1 == 0)) {
            return (x2, y2, z2);
        }

        if ((x2 == 0) && (y2 == 0)) {
            return (x1, y1, z1);
        }

        if ((x1 == x2) && (y1 == y2)) {
            (l, lz) = _jMul(x1, z1, x1, z1);
            (l, lz) = _jMul(l, lz, 3, 1);
            (l, lz) = _jAdd(l, lz, a, 1);

            (da, db) = _jMul(y1, z1, 2, 1);
        } else {
            (l, lz) = _jSub(y2, z2, y1, z1);
            (da, db) = _jSub(x2, z2, x1, z1);
        }

        (l, lz) = _jDiv(l, lz, da, db);

        (x3, da) = _jMul(l, lz, l, lz);
        (x3, da) = _jSub(x3, da, x1, z1);
        (x3, da) = _jSub(x3, da, x2, z2);

        (y3, db) = _jSub(x1, z1, x3, da);
        (y3, db) = _jMul(y3, db, l, lz);
        (y3, db) = _jSub(y3, db, y1, z1);

        if (da != db) {
            x3 = mulmod(x3, db, n);
            y3 = mulmod(y3, da, n);
            z3 = mulmod(da, db, n);
        } else {
            z3 = da;
        }
    }

    function _ecDouble(
        uint256 x1,
        uint256 y1,
        uint256 z1
    )
        internal
        view
        returns (
            uint256 x3,
            uint256 y3,
            uint256 z3
        )
    {
        (x3, y3, z3) = _ecAdd(x1, y1, z1, x1, y1, z1);
    }

    function _jMul(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    ) internal view returns (uint256 x3, uint256 z3) {
        (x3, z3) = (mulmod(x1, x2, n), mulmod(z1, z2, n));
    }

    function _jDiv(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    ) internal view returns (uint256 x3, uint256 z3) {
        (x3, z3) = (mulmod(x1, z2, n), mulmod(z1, x2, n));
    }

    function _jAdd(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    ) internal view returns (uint256 x3, uint256 z3) {
        (x3, z3) = (
            addmod(mulmod(z2, x1, n), mulmod(x2, z1, n), n),
            mulmod(z1, z2, n)
        );
    }

    function _jSub(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    ) internal view returns (uint256 x3, uint256 z3) {
        (x3, z3) = (
            addmod(mulmod(z2, x1, n), mulmod(n - x2, z1, n), n),
            mulmod(z1, z2, n)
        );
    }
}
pragma solidity >=0.4.21 <0.6.0;
//pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AirlineApp.sol";

contract FlightSuretyApp is Ownable, ReentrancyGuard, AirlineApp {
    // Allow SafeMath functions to be called for all uint256 types (similar to
    // "prototype" in Javascript)
    using SafeMath for uint256;

    /*************************************************************************/
    /*                            DATA VARIABLES                             */
    /*************************************************************************/
    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // Incremented to add pseudo-randomness at various points
    uint8 private _nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        // Account that requested status
        address requester;
        // If open, oracle responses are accepted
        bool isOpen;
        // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
        mapping(uint8 => address[]) responses;
    }

    // Track all oracle responses
    // Key = hash(index, airline, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    FlightSuretyData flightSuretyData;

    address payable private _dataContract;

    /*************************************************************************/
    /*                           EVENT DEFINITIONS                           */
    /*************************************************************************/
    // Event fired once enough oracles have submitted the same response
    event FlightStatusInfo(
        bytes32 indexed flightKey,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired each time an oracle submits a response
    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 indexed index,
        address airline,
        string flight,
        uint256 timestamp
    );

    /*************************************************************************/
    /*                              CONSTRUCTOR                              */
    /*************************************************************************/
    constructor(address payable dataContract, uint8 pausers)
        public
        AirlineApp(dataContract, pausers)
    {
        flightSuretyData = FlightSuretyData(dataContract);
        _dataContract = dataContract;
    }

    /*************************************************************************/
    /*                          FUNCTION MODIFIERS                           */
    /*************************************************************************/

    /*************************************************************************/
    /*                           UTILITY FUNCTIONS                           */
    /*************************************************************************/
    /**
    * @dev Returns a key used to track flights
    */
    function _getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
    /**
    * @dev Returns a key used to track oracles responses
    */
    function _getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 index
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(index, airline, flight, timestamp));
    }

    /**
    * @dev Returns array of three non-duplicating integers from 0-9
    */
    function _generateIndexes(address account)
        private
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = _getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = _getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = _getRandomIndex(account);
        }

        return indexes;
    }

    /**
    * @dev Returns a pseudo random integer from 0-9
    */
    function _getRandomIndex(address account) private returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing _nonce adds variation
        uint8 random = uint8(
            uint256(
                    keccak256(
                        abi.encodePacked(
                            blockhash(block.number - _nonce++),
                            account
                        )
                    )
                ) %
                maxValue
        );

        if (_nonce > 250) {
            // Can only fetch blockhashes for last 256 blocks so we adapt
            _nonce = 0;
        }

        return random;
    }

    /*************************************************************************/
    /*                       SMART CONTRACT FUNCTIONS                        */
    /*************************************************************************/
    /**
    * @dev Register a future flight for insuring.
    */
    function registerFlight(string calldata flight, uint256 timestamp)
        external
        whenNotPaused
        onlyAirline
    {
        bytes32 key = _getFlightKey(msg.sender, flight, timestamp);
        require(
            !flightSuretyData.isFlightRegistered(key),
            "Flight is already registered"
        );
        address airline = msg.sender;
        flightSuretyData.registerFlight(
            key,
            airline,
            timestamp,
            STATUS_CODE_UNKNOWN
        );
    }

    /**
    * @dev Allow passenger to purchase insurance
    */
    function purchaseInsurance(bytes32 key) public payable whenNotPaused {
        require(
            msg.value > 0 ether,
            "Passenger need to send some ether to purchase flight insurance"
        );
        require(
            msg.value <= 1 ether,
            "Maximum insurance purchase amount is 1 ether"
        );
        require(
            flightSuretyData.isFlightRegistered(key),
            "Flight is not registered"
        );

        _dataContract.transfer(msg.value);
        flightSuretyData.buy(msg.sender, key, msg.value, 150);
    }

    function claim(bytes32 flightKey) external whenNotPaused nonReentrant {
        require(
            flightSuretyData.getStatus(flightKey) == STATUS_CODE_LATE_AIRLINE,
            "Flight is not delayed due to airline fault"
        );
        flightSuretyData.creditInsuree(flightKey, msg.sender);
    }

    function checkBalance() external view whenNotPaused returns (uint256) {
        uint256 balance = flightSuretyData.checkBalance(msg.sender);
        return balance;
    }

    /**
    * @dev Allow a user to withdraw its balance
    */
    function withdraw() external whenNotPaused nonReentrant {
        flightSuretyData.pay(msg.sender);
    }

    /**
    * @dev Called after oracle has updated flight status
    */
    function _processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) private {
        bytes32 key = _getFlightKey(airline, flight, timestamp);
        flightSuretyData.updateFlightStatus(key, statusCode, timestamp);
    }

    /**
    * @dev Generate a request for oracles to fetch flight information
    */
    function fetchFlightStatus(
        address airline,
        string calldata flight,
        uint256 timestamp
    ) external whenNotPaused {
        uint8 index = _getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = _getFlightKey(airline, flight, timestamp, index);
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    /**
    * @dev Register an oracle with the contract
    */
    function registerOracle() external payable whenNotPaused {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = _generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    /**
    * @dev Returns indexes associated with caller
    */
    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    /**
    * @dev Called by oracle when a response is available to an outstanding
    * request. For the response to be accepted, there must be a pending request
    * that is open and matches one of the three Indexes randomly assigned to
    * the oracle at the time of registration (i.e. uninvited oracles are not
    * welcome).
    */
    function submitOracleResponse(
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) external whenNotPaused {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = _getFlightKey(airline, flight, timestamp, index);
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            bytes32 flightKey = _getFlightKey(airline, flight, timestamp);
            emit FlightStatusInfo(
                flightKey,
                airline,
                flight,
                timestamp,
                statusCode
            );

            oracleResponses[key].isOpen = false;

            // Handle flight status as appropriate
            _processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }
}

contract FlightSuretyData {
    function registerFlight(bytes32, address, uint256, uint8) external;
    function buy(address, bytes32, uint256, uint256) external payable;
    function isFlightRegistered(bytes32) external view returns (bool);
    function getStatus(bytes32) external view returns (uint8);
    function updateFlightStatus(bytes32, uint8, uint256) external;
    function checkBalance(address) external view returns (uint256);
    function creditInsuree(bytes32, address) external;
    function pay(address payable) external;
}

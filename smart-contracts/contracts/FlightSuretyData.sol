pragma solidity >=0.4.21 <0.6.0;
//pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AirlineData.sol";

contract FlightSuretyData is AirlineData {
    using SafeMath for uint256;

    /*************************************************************************/
    /*                            DATA VARIABLES                             */
    /*************************************************************************/
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

    struct Insurance {
        bool isPaid;
        uint256 deposit;
        // rate is in percentage (e.g. 150 for X1.5)
        uint256 rate;
    }
    struct Passenger {
        mapping(bytes32 => Insurance) insurances;
        bytes32[] flights;
        uint256 balance;
    }
    mapping(address => Passenger) private passengers;

    /*************************************************************************/
    /*                              CONSTRUCTOR                              */
    /*************************************************************************/
    constructor(uint8 pausers) public AirlineData(pausers) {}

    /*************************************************************************/
    /*                       SMART CONTRACT FUNCTIONS                        */
    /*************************************************************************/
    /**
    * @dev Register a future flight for insuring.
    */
    function registerFlight(
        bytes32 key,
        address airline,
        uint256 timestamp,
        uint8 statusCode
    ) external whenNotPaused onlyAuthorizedContract {
        flights[key] = Flight({
            isRegistered: true,
            statusCode: statusCode,
            updatedTimestamp: timestamp,
            airline: airline
        });
    }

    /**
    * @dev Get flight info
    */
    //function getFlight(bytes32 key)
    //    external
    //    view
    //    whenNotPaused
    //    onlyAuthorizedContract
    //    returns (bool, uint8, uint256, address)
    ////Flight memory
    //{
    //    return flights[key]; // (flights[key].isRegistered, flights[key].statusCode, flights[key].updatedTimestamp, flights[key].airline);
    //}

    function isFlightRegistered(bytes32 key)
        external
        view
        whenNotPaused
        onlyAuthorizedContract
        returns (bool)
    {
        return flights[key].isRegistered;
    }

    function getStatus(bytes32 key)
        external
        view
        whenNotPaused
        onlyAuthorizedContract
        returns (uint8)
    {
        return flights[key].statusCode;
    }

    /**
    * @dev Update flight status
    */
    function updateFlightStatus(
        bytes32 key,
        uint8 statusCode,
        uint256 timestamp
    ) external whenNotPaused onlyAuthorizedContract {
        flights[key].statusCode = statusCode;
        flights[key].updatedTimestamp = timestamp;
    }

    /**
    * @dev Buy insurance for a flight
    */
    function buy(
        address passenger,
        bytes32 flightKey,
        uint256 amount,
        uint256 rate
    ) external payable whenNotPaused onlyAuthorizedContract {
        Insurance memory insurance = Insurance({
            isPaid: false,
            deposit: amount,
            rate: rate
        });
        passengers[passenger].insurances[flightKey] = insurance;
    }

    /**
    * @dev Returns the balance of a passenger
    */
    function checkBalance(address passenger)
        external
        view
        whenNotPaused
        onlyAuthorizedContract
        returns (uint256)
    {
        return passengers[passenger].balance;
    }

    //function getInsurance(address passenger, bytes32 flightKey)
    //    external
    //    view
    //    whenNotPaused
    //    onlyAuthorizedContract
    //    returns (Insurance memory)
    //{
    //    return passengers[passenger].insurances[flightKey];
    //}

    /**
    * @dev Credits payouts to insuree
    */
    function creditInsuree(bytes32 flightKey, address passenger)
        external
        whenNotPaused
        onlyAuthorizedContract
    {
        require(
            passengers[passenger].insurances[flightKey].deposit > 0,
            "Passenger did not purchase insurance for this flight"
        );
        require(
            !passengers[passenger].insurances[flightKey].isPaid,
            "Insuree already credited"
        );

        passengers[passenger].insurances[flightKey].isPaid = true;
        uint256 deposit = passengers[passenger].insurances[flightKey].deposit;
        uint256 rate = passengers[passenger].insurances[flightKey].rate;
        uint256 balance = passengers[passenger].balance;
        passengers[passenger].balance = balance.add(deposit.mul(rate).div(100));
    }

    /**
    * @dev Transfers balance funds to insuree
    */
    function pay(address payable passenger)
        external
        whenNotPaused
        onlyAuthorizedContract
    //nonReentrant
    {
        require(
            passengers[passenger].balance > 0,
            "Passenger does not have any credit"
        );

        uint256 balance = passengers[passenger].balance;
        passengers[passenger].balance = 0;
        passenger.transfer(balance);
    }
}

pragma solidity >=0.4.21 <0.6.0;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./MultiPartyPausable.sol";

/**
 * @dev Contract module that defines registered airlines
 */
contract AirlineApp is Context, MultiPartyPausable {
    using SafeMath for uint256;

    /*************************************************************************/
    /*                            DATA VARIABLES                             */
    /*************************************************************************/
    AirlineData airlineData;

    // Initial funding fee to be paid by new airline
    uint256 public constant FUNDING_FEE = 10 ether;

    address payable private _dataContract;

    /*************************************************************************/
    /*                           EVENT DEFINITIONS                           */
    /*************************************************************************/

    /*************************************************************************/
    /*                              CONSTRUCTOR                              */
    /*************************************************************************/
    constructor(address payable dataContract, uint8 pausers)
        public
        MultiPartyPausable(pausers)
    {
        airlineData = AirlineData(dataContract);
        _dataContract = dataContract;
    }

    /*************************************************************************/
    /*                          FUNCTION MODIFIERS                           */
    /*************************************************************************/
    modifier onlyAirline() {
        require(
            airlineData.isAirline(_msgSender()),
            "AirlineRole: caller does not have the Airline role"
        );
        _;
    }

    modifier notAirline(address account) {
        require(
            !airlineData.isAirline(account),
            "AirlineRole: this account is already an airline"
        );
        _;
    }

    modifier notAlreadyVotedFor(address airline) {
        address[] memory voters = airlineData.getVotes(airline);
        for (uint8 c = 0; c < voters.length; c++) {
            require(
                voters[c] != _msgSender(),
                "Caller has already called this function."
            );
        }
        _;
    }

    modifier notRegistered(address airline) {
        require(
            !airlineData.isRegistered(airline),
            "Airline is already registered"
        );
        _;
    }

    modifier onlyRegistered() {
        require(
            airlineData.isRegistered(_msgSender()),
            "Airline is not registered"
        );
        _;
    }

    modifier enoughFunding() {
        require(msg.value >= FUNDING_FEE, "Minimum funding fee not met");
        _;
    }

    /*************************************************************************/
    /*                           UTILITY FUNCTIONS                           */
    /*************************************************************************/
    function _requiredVotes() private view returns (uint256) {
        uint256 airlinesCount = airlineData.airlinesCount();
        return
            airlinesCount < 4 ? 1 : airlinesCount.div(2) + airlinesCount.mod(2);
    }

    /*************************************************************************/
    /*                       SMART CONTRACT FUNCTIONS                        */
    /*************************************************************************/

    function addAirline(address airline)
        external
        whenNotPaused
        onlyAirline
        notAirline(airline)
        notRegistered(airline)
        notAlreadyVotedFor(airline)
    {
        airlineData.voteForAirline(airline, _msgSender());

        address[] memory votes = airlineData.getVotes(airline);
        if (votes.length >= _requiredVotes()) {
            airlineData.deleteAirlineVotes(airline);
            airlineData.registerAirline(airline);
        }
    }

    /**
    * @dev Initial funding for the insurance. Unless there are too many delayed
    * flights resulting in insurance payouts, the contract should be
    * self-sustaining.
    */
    function fund() public payable whenNotPaused enoughFunding onlyRegistered {
        _dataContract.transfer(msg.value);
        airlineData.addAirline(_msgSender());
    }

    /**
    * @dev Fallback function for funding smart contract.
    */
    function() external payable {
        fund();
    }

}

contract AirlineData {
    uint256 public airlinesCount;

    function isAirline(address) public view returns (bool);

    function addAirline(address) external;

    function voteForAirline(address, address) external;

    function deleteAirlineVotes(address) external;

    function getVotes(address) external returns (address[] memory);

    function registerAirline(address) external;

    function isRegistered(address) external view returns (bool);

    function deleteAirlineRegistration(address) external;
}

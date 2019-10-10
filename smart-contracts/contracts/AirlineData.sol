pragma solidity >=0.4.21 <0.6.0;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/access/Roles.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./MultiPartyPausable.sol";

/**
 * @dev Contract module that defines registered airlines
 */
contract AirlineData is Context, Ownable, MultiPartyPausable {
    using Roles for Roles.Role;
    using SafeMath for uint256;

    /*************************************************************************/
    /*                            DATA VARIABLES                             */
    /*************************************************************************/
    Roles.Role private _airlines;

    uint256 public airlinesCount = 0;

    mapping(address => bool) private authorizedContracts;

    // Mapping of lists of airlines that have voted to (un)register a(n) (new)
    // airline.
    mapping(address => address[]) private _votes;

    // Mapping to keep track of registered airlines (not funded yet)
    mapping(address => bool) private _registrationQueue;

    /*************************************************************************/
    /*                           EVENT DEFINITIONS                           */
    /*************************************************************************/
    event AirlineAdded(address indexed account);
    event AirlineRemoved(address indexed account);
    event VoteReceived(address indexed voter, address airline);

    /*************************************************************************/
    /*                              CONSTRUCTOR                              */
    /*************************************************************************/
    constructor(uint8 pausers) public MultiPartyPausable(pausers) {
        _addAirline(_msgSender());
    }

    /*************************************************************************/
    /*                          FUNCTION MODIFIERS                           */
    /*************************************************************************/
    modifier onlyAuthorizedContract() {
        require(authorizedContracts[_msgSender()], "Caller is not authorized");
        _;
    }

    /*************************************************************************/
    /*                           UTILITY FUNCTIONS                           */
    /*************************************************************************/
    function authorizeContract(address contractAddress)
        external
        onlyOwner
        whenNotPaused
    {
        authorizedContracts[contractAddress] = true;
    }

    function deauthorizeContract(address contractAddress)
        external
        onlyOwner
        whenNotPaused
    {
        delete authorizedContracts[contractAddress];
    }

    /*************************************************************************/
    /*                       SMART CONTRACT FUNCTIONS                        */
    /*************************************************************************/

    function isAirline(address account) public view returns (bool) {
        return _airlines.has(account);
    }

    function addAirline(address account)
        external
        whenNotPaused
        onlyAuthorizedContract
    {
        _addAirline(account);
    }

    function renounceAirline() public whenNotPaused {
        _removeAirline(_msgSender());
    }

    function _addAirline(address account) private {
        _airlines.add(account);
        airlinesCount++;
        emit AirlineAdded(account);
    }

    function _removeAirline(address account) private {
        _airlines.remove(account);
        airlinesCount--;
        emit AirlineRemoved(account);
    }

    function voteForAirline(address airline, address voter)
        external
        whenNotPaused
        onlyAuthorizedContract
    {
        _votes[airline].push(voter);
        emit VoteReceived(voter, airline);
    }

    function deleteAirlineVotes(address airline)
        external
        whenNotPaused
        onlyAuthorizedContract
    {
        delete _votes[airline];
    }

    function getVotes(address airline)
        external
        view
        onlyAuthorizedContract
        returns (address[] memory)
    {
        return _votes[airline];
    }

    function registerAirline(address airline)
        external
        whenNotPaused
        onlyAuthorizedContract
    {
        _registrationQueue[airline] = true;
    }

    function isRegistered(address airline)
        external
        view
        onlyAuthorizedContract
        returns (bool)
    {
        return _registrationQueue[airline];
    }

    function deleteAirlineRegistration(address airline)
        external
        whenNotPaused
        onlyAuthorizedContract
    {
        delete _registrationQueue[airline];
    }

    /**
    * @dev Fallback function as a sink.
    */
    function() external payable {}
}

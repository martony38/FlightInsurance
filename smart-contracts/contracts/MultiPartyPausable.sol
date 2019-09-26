pragma solidity >=0.4.21 <0.6.0;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/access/roles/PauserRole.sol";

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by m of n authorized accounts.
 * Inspired by https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/lifecycle/Pausable.sol
 */
contract MultiPartyPausable is Context, PauserRole {
    /*************************************************************************/
    /*                            DATA VARIABLES                             */
    /*************************************************************************/
    bool private _paused;

    // List of admins that have toggled pause
    address[] private _toggledPausers;

    // Treshold to reach multi-party consensus to toggle pause
    uint8 private _requiredPausers;

    /*************************************************************************/
    /*                           EVENT DEFINITIONS                           */
    /*************************************************************************/
    /**
     * @dev Emitted when the pause is triggered by a pauser (`account`).
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by a pauser (`account`).
     */
    event Unpaused(address account);

    /*************************************************************************/
    /*                              CONSTRUCTOR                              */
    /*************************************************************************/
    /**
     * @dev Initializes the contract in unpaused state. Assigns the Pauser role
     * to the deployer.
     */
    constructor(uint8 requiredPausers) internal {
        _paused = false;
        _requiredPausers = requiredPausers;
    }

    /*************************************************************************/
    /*                          FUNCTION MODIFIERS                           */
    /*************************************************************************/
    /**
     * @dev Modifier to make a function callable only when the contract is not
     * paused.
     */
    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is
     * paused.
     */
    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }

    modifier notDuplicate() {
        for (uint8 c = 0; c < _toggledPausers.length; c++) {
            require(
                _toggledPausers[c] != _msgSender(),
                "Caller has already called this function."
            );
        }
        _;
    }

    /*************************************************************************/
    /*                           UTILITY FUNCTIONS                           */
    /*************************************************************************/

    /*************************************************************************/
    /*                       SMART CONTRACT FUNCTIONS                        */
    /*************************************************************************/
    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view returns (bool) {
        return _paused;
    }

    /**
     * @dev Called by a pauser to pause, triggers stopped state.
     */
    function pause() public onlyPauser whenNotPaused notDuplicate {
        _toggledPausers.push(_msgSender());
        if (_toggledPausers.length >= _requiredPausers) {
            _paused = true;
            _toggledPausers = new address[](0);
            emit Paused(_msgSender());
        }
    }

    /**
     * @dev Called by a pauser to unpause, returns to normal state.
     */
    function unpause() public onlyPauser whenPaused notDuplicate {
        _toggledPausers.push(_msgSender());
        if (_toggledPausers.length >= _requiredPausers) {
            _paused = false;
            _toggledPausers = new address[](0);
            emit Unpaused(_msgSender());
        }
    }

}

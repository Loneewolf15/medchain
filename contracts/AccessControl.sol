// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MedChain AccessControl
/// @notice Minimal on-chain access-control registry for patient records.
///         Deployed on Hedera via the Hedera Smart Contract Service (HSCS).
///         Only used when the backend's LEDGER_MODE=smart_contract; in
///         LEDGER_MODE=hcs the equivalent decision is made off-chain in the
///         app database instead, and this contract is never deployed.
/// @dev    No PHI ever touches this contract — only opaque patient/grantee
///         IDs (already pseudonymous UUIDs from the backend) and a scope
///         string ("clinical" | "diagnostic" | "administrative" | "all").
contract AccessControl {
    struct Grant {
        bool active;
        uint256 updatedAt;
        address updatedBy;
    }

    // keccak256(patientId, granteeId, scope) => grant state
    mapping(bytes32 => Grant) private grants;

    event AccessGranted(string patientId, string granteeId, string scope, address indexed grantedBy, uint256 timestamp);
    event AccessRevoked(string patientId, string granteeId, string scope, address indexed revokedBy, uint256 timestamp);

    function _key(string memory patientId, string memory granteeId, string memory scope) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(patientId, "|", granteeId, "|", scope));
    }

    function grantAccess(string memory patientId, string memory granteeId, string memory scope) public {
        bytes32 key = _key(patientId, granteeId, scope);
        grants[key] = Grant({active: true, updatedAt: block.timestamp, updatedBy: msg.sender});
        emit AccessGranted(patientId, granteeId, scope, msg.sender, block.timestamp);
    }

    function revokeAccess(string memory patientId, string memory granteeId, string memory scope) public {
        bytes32 key = _key(patientId, granteeId, scope);
        grants[key] = Grant({active: false, updatedAt: block.timestamp, updatedBy: msg.sender});
        emit AccessRevoked(patientId, granteeId, scope, msg.sender, block.timestamp);
    }

    /// @notice Returns true if `granteeId` can access `scope` data for `patientId`,
    ///         either via an exact-scope grant or a blanket "all" grant.
    function hasAccess(string memory patientId, string memory granteeId, string memory scope) public view returns (bool) {
        if (grants[_key(patientId, granteeId, "all")].active) {
            return true;
        }
        return grants[_key(patientId, granteeId, scope)].active;
    }
}

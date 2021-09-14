// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

// @dev Just to import TimelockController.sol, so that it compiles and generate artifacts
abstract contract MockTimelockController is TimelockController {

}

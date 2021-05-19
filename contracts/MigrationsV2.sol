pragma solidity >=0.4.21 <0.6.0;

contract MigrationsV2 {
  address public owner;
  uint public last_completed_migration;

  constructor() public {
    owner = msg.sender;
  }

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) public restricted {
    MigrationsV2 upgraded = MigrationsV2(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}

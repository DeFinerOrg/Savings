#!/bin/bash

failed=0

echo "Model: $1"

declare -a modelArr=("$1")

yarn prepare

for model in "${modelArr[@]}"
  do
    echo "$model"
    rm -rf compound-protocol/networks/development.json
    cp snapshots/config/$model.json compound-protocol/networks/development.json

    # Run each test file individually
    for file in $(find test/$model -type f -name "*.spec.ts");
    do
      # delete previous ganache snapshot and extract a fresh copy  
      rm -rf snapshots/$model
      unzip -qq snapshots/$model.zip -d ./snapshots

      echo "Starting Ganache..."
      npx ganache-cli --gasLimit 0x1fffffffffffff \
        --gasPrice 20000000 \
        --defaultBalanceEther 1000000000 \
        --allowUnlimitedContractSize true \
        --mnemonic "begin vessel olive rocket pink distance admit foam lizard type fault enjoy" \
        --db="./snapshots/$model" \
        --deterministic > /dev/null 2>&1 &
      export NODE_PID=$!
      echo "PID: $NODE_PID"
      echo "Running test $file"
      cmd="npx hardhat test $file --network development"
      $cmd
      status=$?
      if [ $status -eq 0 ]
      then
        echo "'$cmd' command was successful: $status"
      else
        echo "'$cmd' failed: $status"
        failed=1
      fi 

      kill $NODE_PID
      echo "Sleeping for 5 seconds..."
      sleep 5s
      echo "Done."
    done
  done

echo "Failed Status: $failed"
exit $failed
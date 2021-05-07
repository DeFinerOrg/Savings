#!/bin/bash

failed=0

# rm -rf snapshots/scriptFlywheel compound-protocol/networks/development.json
# unzip -qq snapshots/scriptFlywheel.zip -d ./snapshots
# cp snapshots/config/scriptFlywheel.json compound-protocol/networks/development.json

declare -a modelArr=("scriptFlywheel" "whitePaperModel")

for model in "${modelArr[@]}"
do
    rm -rf snapshots/$model compound-protocol/networks/development.json
    unzip -qq snapshots/$model.zip -d ./snapshots
    cp snapshots/config/$model.json compound-protocol/networks/development.json

    echo "$model"
    # Run each test file individually
    for file in $(find ./test/$model -type f -name "*.spec.ts");
    do 
      echo "Starting Ganache..."
      ganache-cli --gasLimit 0x1fffffffffffff \
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
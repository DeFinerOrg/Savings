
file=$1
whitePaperModel='whitePaperModel'
scriptFlywheel='scriptFlywheel'

rm -rf compound-protocol/networks/development.json

echo $file

if [[ "$file" == *"$whitePaperModel"* ]]; then
    model=$whitePaperModel
fi

if [[ "$file" == *"$scriptFlywheel"* ]]; then
    model=$scriptFlywheel
fi

cp snapshots/config/$model.json compound-protocol/networks/development.json
rm -rf snapshots/$model
unzip -qq snapshots/$model.zip -d ./snapshots
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
kill $NODE_PID
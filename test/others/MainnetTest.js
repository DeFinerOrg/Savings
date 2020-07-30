const ERC20 = artifacts.require("ERC20Detailed");
let BN = web3.utils.BN;

contract("MainnetTest", (accounts) => {
    it("should mint mainnet tokens", async () => {
        if (process.env.NETWORK != "fork") return;

        const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
        const BAT = "0x0D8775F648430679A709E98d2b0Cb6250d2887EF";
        const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const ZRX = "0xE41d2489571d322189246DaFA5ebDe1F4699F498";
        const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
        const tokensArray = [DAI, BAT, USDC, ZRX, USDT];

        const BitFinex = "0x876EabF441B2EE5B5b0554Fd502a8E0600950cFa";

        // Transfer DAI's from BitFinex account
        console.log("Transferring ERC20 tokens to all accounts...");
        const HUNDRED = new BN(100);
        let i = 0;
        let j = 0;
        for (i = 0; i < tokensArray.length; i++) {
            // Get Balance of Tokens, BitFinex account has
            let tokenInstance = await ERC20.at(tokensArray[i]);
            let tokenSymbol = await tokenInstance.symbol();
            let tokenDecimals = await tokenInstance.decimals();
            let bal = await tokenInstance.balanceOf(BitFinex);

            console.log(
                "Token:: Symbol: " +
                    tokenSymbol +
                    " Decimals: " +
                    tokenDecimals +
                    " BitFinex Balance: " +
                    bal.toString()
            );

            for (j = 0; j < accounts.length; j++) {
                let ONE_TOKEN = new BN(10).pow(tokenDecimals);
                let HUNDRED_TOKENS = HUNDRED.mul(ONE_TOKEN);
                await tokenInstance.transfer(accounts[j], HUNDRED_TOKENS, { from: BitFinex });
                bal = await tokenInstance.balanceOf(accounts[j]);
                console.log("Total Balance of acc " + accounts[j] + " bal:" + bal);
            }
        }
    });
});

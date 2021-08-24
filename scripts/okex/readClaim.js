const TESTNET_SavingAccount = "0xd910903BD857Fa8FA8BDE47502fFf3199199e96C";
const TESTNET_Utlils = "0x6317F6759f3323B056393BfA7C1FBF6028BB7b43";
const TESTNET_SavingLib = "0xe8AF57B605b4b34da0444b21482f607501E24152";
const TESTNET_OKT = "0x000000000000000000000000000000000000000E";
const TESTNET_USDT = "0xe579156f9decc4134b5e3a30a24ac46bb8b01281";
async function main() {
    const SavingAccount = await hre.ethers.getContractFactory("SavingAccount", {
        libraries: { Utils: TESTNET_Utlils, SavingLib: TESTNET_SavingLib },
    });
    const savingAccount = await SavingAccount.attach(TESTNET_SavingAccount);

    // for msg.sender
    const claim = await savingAccount.callStatic.claim();
    console.log("claim(): ", claim.toString());

    const oktDepositClaim = await savingAccount.callStatic.claimDepositFIN(TESTNET_OKT);
    console.log("claimDepositFIN(OKT): ", oktDepositClaim.toString());

    const oktBorrowClaim = await savingAccount.callStatic.claimBorrowFIN(TESTNET_OKT);
    console.log("claimBorrowFIN(OKT): ", oktBorrowClaim.toString());

    const usdtDepositClaim = await savingAccount.callStatic.claimDepositFIN(TESTNET_USDT);
    console.log("claimDepositFIN(USDT): ", usdtDepositClaim.toString());

    const usdtBorrowClaim = await savingAccount.callStatic.claimBorrowFIN(TESTNET_USDT);
    console.log("claimBorrowFIN(USDT): ", usdtBorrowClaim.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

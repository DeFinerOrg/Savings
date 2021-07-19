const hre = require("hardhat");
const { BN } = require("@openzeppelin/test-helpers/src/setup");

const SAVING_ACCOUNT_ADDR = "0xa264d77cf20Af0943F1a38b2eF96f6A8BD49A78e";
const ACCOUNTS_ADDR = "0x84fE4d81A498b6dED4E2c8B01fF1705f979572D9";
const AccountTokenLibAddr = "0x1780F815732190726160f46c620382FFf6836D92";
const UtilsAddr = "0xac9391B80eFbE05c1a0F0a909b365DEf5F59F46A";
const SavingLibAddr = "0x30247D9C0CB73cA72FF7F06D55bcd16b78035Ef0";
const GLOBAL_CONFIG_ADDR = "0x949dCb3A51ccC543fe0B1E29C7d383d41525Cc82";

async function main() {
    const GlobalConfig = await hre.ethers.getContractFactory("GlobalConfig");
    const globalConfig = await GlobalConfig.attach(GLOBAL_CONFIG_ADDR);

    const Accounts = await hre.ethers.getContractFactory("Accounts", {
        libraries: { AccountTokenLib: AccountTokenLibAddr },
    });
    const accounts = await Accounts.attach(ACCOUNTS_ADDR);

    const SavingAccount = await hre.ethers.getContractFactory("SavingAccount", {
        libraries: {
            Utils: UtilsAddr,
            SavingLib: SavingLibAddr,
        },
    });
    const savingAccount = await SavingAccount.attach(SAVING_ACCOUNT_ADDR);

    console.log(await accounts.ETH_ADDR());

    const liquidationThreshold = await globalConfig.liquidationThreshold();
    const liquidationDiscountRatio = await globalConfig.liquidationDiscountRatio();
    const borrower = "0x27cC9a4ef54A44a832E15BE540e059eD57866Ed1";
    const collateralOKT = "0x000000000000000000000000000000000000000E";
    const borrowFIN = "0xffb7559a201ee93feaa39355f2416193e15434d1";

    const oktDepositBal = await accounts.getDepositBalanceCurrent(collateralOKT, borrower);
    console.log("OKT Depsoit:", oktDepositBal.toString());

    const finBorrowBal = await accounts.getBorrowBalanceCurrent(borrowFIN, borrower);
    console.log("FIN Borrow:", finBorrowBal.toString());

    const isAccountLiquidatable = await accounts.callStatic.isAccountLiquidatable(borrower);
    console.log("isAccountLiquidatable:", isAccountLiquidatable);

    const borrowedETH = await accounts.getBorrowETH(borrower);
    console.log("borrowedETH:", borrowedETH.toString());

    const depositedETH = await accounts.getDepositETH(borrower);
    console.log("depositedETH:", depositedETH.toString());

    const firstPart = new BN(borrowedETH.toString()).mul(new BN(100));
    const secondPart = new BN(depositedETH.toString()).mul(new BN(liquidationThreshold.toString()));
    const check1 = firstPart.gt(secondPart);
    console.log("totalBorrow.mul(100) > totalCollateral.mul(liquidationThreshold)", check1);

    const thirtPart = new BN(depositedETH.toString()).mul(
        new BN(liquidationDiscountRatio.toString())
    );
    const check2 = firstPart.lte(thirtPart);
    console.log("totalBorrow.mul(100) <= totalCollateral.mul(liquidationDiscountRatio)", check2);
    // const tx = await savingAccount.liquidate(borrower, borrowFIN, collateralOKT);
    // console.log(tx);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

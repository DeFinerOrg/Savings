export class CompoundUtils {
    public compound: any;

    private loanJson() {
        this.compound = require("../compound-protocol/networks/development.json");
    }

    public getComptroller(): string {
        this.loanJson();
        return this.compound.Contracts.Comptroller;
    }
}

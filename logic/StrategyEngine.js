const S17HardTable = {
    16 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    12 : {2: "H", 3: "H", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    11 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "D", 11: "H"},
    10 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "H", 11: "H"},
    9 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};
const H17HardTable = {//only {11 : 11} is different
    16 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    12 : {2: "H", 3: "H", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    11 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "D", 11: "D"},
    10 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "H", 11: "H"},
    9 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};
const S17SoftTable = {
    18 : {2: "S", 3: "Ds", 4: "Ds", 5: "Ds", 6: "Ds", 7: "S", 8: "S", 9: "H", 10: "H", 11: "H"},
    17 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    16 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};

const H17SoftTable = {//only {19 : 19} and {18 : 2} are different
    19 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "Ds", 7: "S", 8: "S", 9: "S", 10: "S", 11: "S"},
    18 : {2: "Ds", 3: "Ds", 4: "Ds", 5: "Ds", 6: "Ds", 7: "S", 8: "S", 9: "H", 10: "H", 11: "H"},
    17 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    16 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};

const SplitTable = {
    11 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "Y", 9: "Y", 10: "Y", 11: "Y"},
    10 : {2: "N", 3: "N", 4: "N", 5: "N", 6: "N", 7: "N", 8: "N", 9: "N", 10: "N", 11: "N"},
    9 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "N", 8: "Y", 9: "Y", 10: "N", 11: "N"},
    8 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "Y", 9: "Y", 10: "Y", 11: "Y"},
    7 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
    6 : {2: "Y/n", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    5 : {2: "N", 3: "N", 4: "N", 5: "N", 6: "N", 7: "N", 8: "N", 9: "N", 10: "H", 11: "H"},
    4 : {2: "N", 3: "N", 4: "N", 5: "Y/n", 6: "Y/n", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    3 : {2: "Y/n", 3: "Y/n", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
    2 : {2: "Y/n", 3: "Y/n", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
};



class StrategyEngine {
    /**
     * Returns the recommended action for a hand
     * "H" = Hit, "S" = Stand, "D" = Double, "P" = Split
     */
    static getDecision(player, handIndex, dealerUpCard, rules) {
        const hand = player.hands[handIndex];
        const playerTotal = player.getHandValue(handIndex);
        const dealerValue = dealerUpCard.getValue();
        const isSoft = player.isSoftHand(handIndex);

        if (hand.isFinished) return "S"; // Finished hands always stand

        // Check if split is possible
        if (player.canSplit(handIndex, rules)) {
            const pairValue = hand.cards[0].getValue();
            const splitDecision = SplitTable[pairValue]?.[dealerValue];
            if (splitDecision === "Y" || splitDecision === "Y/n") return "P";
        }

        // Select the proper table based on dealer rules
        let tableDecision;
        if (isSoft) {
            const softTable = rules.dealerHitsSoft17 ? H17SoftTable : S17SoftTable;
            tableDecision = softTable[playerTotal]?.[dealerValue];
        } else {
            const hardTable = rules.dealerHitsSoft17 ? H17HardTable : S17HardTable;
            tableDecision = hardTable[playerTotal]?.[dealerValue];
        }

        // Handle doubles
        if (tableDecision === "D" || tableDecision === "Ds") {
            if (player.canDouble(handIndex, rules)) return "D";
            if (tableDecision === "Ds") return "S"; // Double not allowed on "Ds"
        }

        // Fallback logic for extreme totals
        if (isSoft && playerTotal >= 19) return "S";
        if (!isSoft && playerTotal >= 17) return "S";
        if (!isSoft && playerTotal <= 8) return "H";

        return tableDecision === "S" ? "S" : "H"; // Default to table decision or hit
    }
}


export { StrategyEngine };
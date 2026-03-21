const S17HardTable = {
    16 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    12 : {2: "H", 3: "H", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    11 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "D", 11: "H"},
    10 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "H", 11: "H"},
    9  : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};
const H17HardTable = {
    16 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    12 : {2: "H", 3: "H", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    11 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "D", 11: "D"},
    10 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "H", 11: "H"},
    9  : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};
const S17SoftTable = {
    18 : {2: "S", 3: "Ds", 4: "Ds", 5: "Ds", 6: "Ds", 7: "S", 8: "S", 9: "H", 10: "H", 11: "H"},
    17 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    16 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};
const H17SoftTable = {
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
    9  : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "N", 8: "Y", 9: "Y", 10: "N", 11: "N"},
    8  : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "Y", 9: "Y", 10: "Y", 11: "Y"},
    7  : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
    6  : {2: "Y/n", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    5  : {2: "N", 3: "N", 4: "N", 5: "N", 6: "N", 7: "N", 8: "N", 9: "N", 10: "H", 11: "H"},
    4  : {2: "N", 3: "N", 4: "N", 5: "Y/n", 6: "Y/n", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    3  : {2: "Y/n", 3: "Y/n", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
    2  : {2: "Y/n", 3: "Y/n", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
};

// Dealer up-card descriptions for explanations
function dealerDesc(val) {
    if (val >= 2 && val <= 6) return `${val} (a bust card — dealer is likely to bust)`;
    if (val === 7 || val === 8) return `${val} (a neutral card)`;
    return `${val} (a strong card — dealer is in a good position)`;
}

class StrategyEngine {
    static getDecision(player, handIndex, dealerUpCard, rules) {
        const hand = player.hands[handIndex];
        const playerTotal = player.getHandValue(handIndex);
        const dealerValue = dealerUpCard.getValue();
        const isSoft = player.isSoftHand(handIndex);

        if (hand.isFinished) return "S";

        if (player.canSplit(handIndex, rules)) {
            const pairValue = hand.cards[0].getValue();
            const splitDecision = SplitTable[pairValue]?.[dealerValue];
            if (splitDecision === "Y" || splitDecision === "Y/n") return "P";
        }

        let tableDecision;
        if (isSoft) {
            const softTable = rules.dealerHitsSoft17 ? H17SoftTable : S17SoftTable;
            tableDecision = softTable[playerTotal]?.[dealerValue];
        } else {
            const hardTable = rules.dealerHitsSoft17 ? H17HardTable : S17HardTable;
            tableDecision = hardTable[playerTotal]?.[dealerValue];
        }

        if (tableDecision === "D" || tableDecision === "Ds") {
            if (player.canDouble(handIndex, rules)) return "D";
            if (tableDecision === "Ds") return "S";
        }

        if (isSoft && playerTotal >= 19) return "S";
        if (!isSoft && playerTotal >= 17) return "S";
        if (!isSoft && playerTotal <= 8)  return "H";

        return tableDecision === "S" ? "S" : "H";
    }

    // ======================================================
    // Returns a plain-English explanation for the correct action
    // ======================================================
    static getExplanation(player, handIndex, dealerUpCard, rules) {
        const hand = player.hands[handIndex];
        const playerTotal = player.getHandValue(handIndex);
        const dealerValue = dealerUpCard.getValue();
        const isSoft = player.isSoftHand(handIndex);
        const action = this.getDecision(player, handIndex, dealerUpCard, rules);
        const dd = dealerDesc(dealerValue);

        const actionNames = { H: "HIT", S: "STAND", D: "DOUBLE DOWN", P: "SPLIT" };
        const actionName = actionNames[action] ?? action;

        let reason = "";

        // --- SPLIT explanations ---
        if (action === "P") {
            const rank = hand.cards[0].rank;
            if (rank === "Ace") {
                reason = "Always split Aces. Each Ace gives you a great chance of hitting 21 on the next card.";
            } else if (rank === "8") {
                reason = `Always split 8s. A hard 16 is the worst hand in blackjack — splitting gives you two fresh starts against the dealer's ${dealerValue}.`;
            } else if (rank === "9") {
                reason = `Split 9s here because your 18 isn't strong enough against the dealer's ${dd}. Two hands starting at 9 each have better long-term value.`;
            } else {
                reason = `Splitting ${rank}s here maximises value against the dealer's ${dd}. Each hand starts stronger than the combined total.`;
            }
            return `You should ${actionName} — ${reason}`;
        }

        // --- DOUBLE DOWN explanations ---
        if (action === "D") {
            if (playerTotal === 11) {
                reason = `11 is the best doubling hand. You can't bust with one card, and any 10-value card gives you 21. The dealer's ${dd} makes this even stronger.`;
            } else if (playerTotal === 10) {
                reason = `10 is a strong doubling hand — a 10-value card gives you 20. The dealer showing ${dd} gives you the edge to double your bet.`;
            } else if (playerTotal === 9) {
                reason = `With 9 against the dealer's ${dd}, doubling is profitable. The dealer is likely to bust, and you're in good shape to land a strong total.`;
            } else if (isSoft) {
                reason = `Your soft ${playerTotal} can't bust with one card, and the dealer's ${dd} makes this the right moment to double your bet and apply pressure.`;
            } else {
                reason = `Your ${playerTotal} against the dealer's ${dd} is a good doubling spot. One more card puts you in a strong position while the dealer is vulnerable.`;
            }
            return `You should ${actionName} — ${reason}`;
        }

        // --- STAND explanations ---
        if (action === "S") {
            if (isSoft && playerTotal >= 19) {
                reason = `Soft ${playerTotal} is already a strong hand. There's no reason to risk it — let the dealer play out.`;
            } else if (!isSoft && playerTotal >= 17) {
                reason = `Hard ${playerTotal} is strong enough to stand on. The risk of busting by hitting outweighs any benefit here.`;
            } else if (!isSoft && playerTotal >= 13 && dealerValue <= 6) {
                reason = `With ${playerTotal} against the dealer's ${dd}, you let the dealer take the risk. Dealers must hit until 17, and they're likely to bust here.`;
            } else if (playerTotal === 12 && dealerValue >= 4 && dealerValue <= 6) {
                reason = `Even though 12 feels weak, the dealer's ${dd} means they're in danger of busting. Standing avoids an unnecessary risk.`;
            } else {
                reason = `With ${playerTotal} against the dealer's ${dd}, standing is correct. The dealer's position is weak enough that you don't need to improve.`;
            }
            return `You should ${actionName} — ${reason}`;
        }

        // --- HIT explanations ---
        if (action === "H") {
            if (playerTotal <= 8) {
                reason = `You can't bust with one card, so always hit ${playerTotal}. There's nothing to lose and everything to gain.`;
            } else if (isSoft) {
                reason = `A soft hand can't bust with one card — the Ace will drop to 1 if needed. Hit to try to improve against the dealer's ${dd}.`;
            } else if (playerTotal === 12 && (dealerValue === 2 || dealerValue === 3)) {
                reason = `Even though 12 vs ${dealerValue} feels dangerous, the math says hit. The dealer's ${dd} isn't weak enough to rely on them busting.`;
            } else {
                reason = `With ${playerTotal} against the dealer's ${dd}, you need to improve. The dealer is in too strong a position for you to stand.`;
            }
            return `You should ${actionName} — ${reason}`;
        }

        return `You should ${actionName}.`;
    }
}

export { StrategyEngine };
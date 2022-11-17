const epsilon = 0.000001;

let helper = {
  getPoolIndexByAddress(rPools, address) {
    for (let i = 0; i < rPools.length; i++) {
      if (rPools[i].poolAddress == address) return i;
    }
  },
  findPool(rPools, token0, token1) {
    for (let i = 0; i < rPools.length; i++) {
      if (
        (rPools[i].token0 == token0 && rPools[i].token1 == token1) ||
        (rPools[i].token0 == token1 && rPools[i].token1 == token0)
      )
        return i;
    }

    return -1;
  },
  getPoolIndex(rPools, token0, token1) {
    for (let i = 0; i < rPools.length; i++) {
      if (rPools[i].token0 == token0 && rPools[i].token1 == token1) return i;
    }

    return -1;
  },

  _calculateVirtualPools(rPools, tokens) {
    let vPools = [];

    // let belowReserve = _calculateBelowThreshold();
    let possiblePools = [];
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        if (j == i) continue;
        possiblePools.push({
          token0: tokens[i].address,
          token1: tokens[j].address,
        });
      }
    }

    for (let i = 0; i < possiblePools.length; i++) {
      let nPool = {
        id: i + 1,
        token0Balance: 0,
        token1Balance: 0,
        sumtoken1: 0,
        token0: possiblePools[i].token0,
        token1: possiblePools[i].token1,
        composition: { ks: [], js: [] },
      };

      //check for real pool
      let realPairIndex = this.findPool(rPools, nPool.token0, nPool.token1);
      if (realPairIndex > -1) {
        nPool.realPoolAddress = rPools[realPairIndex].poolAddress;
      }

      vPools.push(nPool);

      for (let k = 0; k < tokens.length; k++) {
        if (
          possiblePools[i].token0 == tokens[k].address ||
          possiblePools[i].token1 == tokens[k].address
        )
          continue;

        let ikIndex = this.findPool(
          rPools,
          possiblePools[i].token0,
          tokens[k].address
        );
        let jkIndex = this.findPool(
          rPools,
          possiblePools[i].token1,
          tokens[k].address
        );

        if (ikIndex == -1 || jkIndex == -1) continue;

        let changedA = vPools[i].token0Balance;

        // let ikBalance0 = rPools[ikIndex].balance0;
        let ikBalance0 = this.getBalanceForToken(
          rPools[ikIndex],
          possiblePools[i].token0
        );
        // let ikBalance1 = rPools[ikIndex].balance1;
        let ikBalance1 = this.getBalanceForToken(
          rPools[ikIndex],
          tokens[k].address
        );
        // let jkBalance0 = rPools[jkIndex].balance0;
        let jkBalance0 = this.getBalanceForToken(
          rPools[jkIndex],
          possiblePools[i].token1
        );
        // let jkBalance1 = rPools[jkIndex].balance1;
        let jkBalance1 = this.getBalanceForToken(
          rPools[jkIndex],
          tokens[k].address
        );

        vPools[i].fee = rPools[jkIndex].fee;
        vPools[i].sumtoken1 += parseFloat(jkBalance0);

        vPools[i].token0Balance =
          vPools[i].token0Balance +
          (ikBalance0 * Math.min(ikBalance1, jkBalance1)) /
            Math.max(ikBalance1, epsilon);

        let changedB = vPools[i].token1Balance;

        vPools[i].token1Balance =
          vPools[i].token1Balance +
          (jkBalance1 * Math.min(ikBalance1, jkBalance1)) /
            Math.max(jkBalance1, epsilon);

        if (
          changedA < vPools[i].token0Balance ||
          changedB < vPools[i].token1Balance
        ) {
          vPools[i].composition.ks.push(rPools[ikIndex].poolAddress);
          vPools[i].composition.js.push(rPools[jkIndex].poolAddress);
        }
      }
    }

    return vPools;
  },

  _calculateTotalPools(rPools, tokens) {
    let vPools = this._calculateVirtualPools(rPools, tokens);
    let tPools = [];

    for (let i = 0; i < vPools.length; i++) {
      let rPoolIndex = this.findPool(
        rPools,
        vPools[i].token0,
        vPools[i].token1
      );
      let tPool = {
        fee: 0,
        token0: 0,
        token1: 0,
        token0Balance: 0,
        token1Balance: 0,
        id: 0,
      };
      let rPool = {};
      if (rPoolIndex == -1) {
        rPool.fee = 0;
        rPool.balance0 = 0;
        rPool.balance1 = 0;
      } else {
        rPool = rPools[rPoolIndex];
        tPool.rPoolAddress = rPool.poolAddress;
      }

      tPool.fee = vPools[i].fee;
      tPool.id = vPools[i].id;
      rPool.balance0 = rPool.balance0 * 1;
      rPool.balance1 = rPool.balance1 * 1;

      tPool.token0 = vPools[i].token0;
      tPool.token1 = vPools[i].token1;

      //get balance per token
      let token0Balance = this.getBalanceForToken(rPool, tPool.token0);
      let token1Balance = this.getBalanceForToken(rPool, tPool.token1);

      tPool.token0Balance = token0Balance + vPools[i].token0Balance;
      tPool.token1Balance = token1Balance + vPools[i].token1Balance;
      tPool.vPool = vPools[i];

      if (tPool.token0Balance > 0) {
        tPool.fee =
          (rPool.fee * token0Balance +
            vPools[i].fee * vPools[i].token0Balance) /
          tPool.token0Balance;
      }

      tPools.push(tPool);
    }
    return tPools;
  },

  sortCommonToken(ikToken0, ikToken1, jkToken0, jkToken1) {
    return ikToken0 == jkToken0
      ? {
          ikToken0: ikToken1,
          ikToken1: ikToken0,
          jkToken0: jkToken1,
          jkToken1: jkToken0,
        }
      : ikToken0 == jkToken1
      ? {
          ikToken0: ikToken1,
          ikToken1: ikToken0,
          jkToken0: jkToken0,
          jkToken1: jkToken1,
        }
      : ikToken1 == jkToken0
      ? {
          ikToken0: ikToken0,
          ikToken1: ikToken1,
          jkToken0: jkToken1,
          jkToken1: jkToken0,
        }
      : { ikToken0, ikToken1, jkToken0, jkToken1 }; //default
  },

  calculateWeightedAmount(amount, nominator, denominator) {
    return amount * (nominator / denominator);
  },

  getBalanceForToken(pool, token0ddress) {
    let token0Balance = 0;
    let token1Balance = 0;

    if (
      pool.hasOwnProperty("token0Balance") &&
      pool.hasOwnProperty("token1Balance")
    ) {
      token0Balance = pool.token0Balance;
      token1Balance = pool.token1Balance;
    } else if (
      pool.hasOwnProperty("balance0") &&
      pool.hasOwnProperty("balance1")
    ) {
      token0Balance = pool.balance0;
      token1Balance = pool.balance1;
    }

    if (pool.token0 == token0ddress)
      return parseFloat(token0Balance.toString());
    if (pool.token1 == token0ddress)
      return parseFloat(token1Balance.toString());

    return 0;
  },
};

module.exports = helper;

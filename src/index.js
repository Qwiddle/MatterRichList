import BigNumber from 'bignumber.js';
import {
  fetchAccountsInternal,
} from './api/tzkt.js';
import {
  fetchMatterPrice
} from './api/spicy.js';

const mapAccounts = async () => {
  const accounts = await fetchAccountsInternal();

  const mapped = accounts.reduce((map, current) => {
    const address = current.key.user_address;
    const grouped = map.get(address);

    current.totalReward = BigNumber(current.value.reward);

    if(!grouped) {
      map.set(address, { 
        totalReward: current.totalReward,
        farms: {
          ...current.farms, 
          [current.key.token.fa2_address]: { 
            tokenId: current.key.token.token_id,
            reward: BigNumber(current.value.reward), 
            staked: BigNumber(current.value.staked).shiftedBy(-12)
          }
        }
      });
    } else {
      map.set(address, { 
        ...grouped, 
        totalReward: BigNumber(grouped.totalReward).plus(BigNumber(current.totalReward)), 
        farms: {
          ...grouped.farms, 
          [current.key.token.fa2_address]: {
            tokenId: current.key.token.token_id,
            reward: BigNumber(current.value.reward), 
            staked: BigNumber(current.value.staked).shiftedBy(-18)
          }
        }
      });
    }

    return map;
  }, new Map);

  return mapped;
}

const sortAccounts = (accounts, descend = true) => {
  const sort = new Map(
    Array.from(accounts).sort((a, b) => {
      if(a[1].totalReward > b[1].totalReward) {
        return descend ? -1 : 1;
      } else {
        return descend ? 1 : -1;
      }
    })
  );

  return sort;
}

const start = async () => {
  const accounts = await mapAccounts();
  const sorted = sortAccounts(accounts);

  const matterPrice = await fetchMatterPrice();
}

start();